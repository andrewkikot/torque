import "server-only";
import { and, asc, desc, eq, ilike, inArray, notInArray, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db, schema } from "@/db";
import { AppError, notFound } from "@/lib/errors";
import { workInput, statusInput } from "@/lib/validation";
import { canTransition, type VisitStatusValue } from "@/lib/domain/visit-status";
import { bumpOdometer, findCarByCheckinCode, getCar, listCars, rotateCheckinCode } from "./cars";
import { resetPlanFromWork } from "./maintenance";
import { membership, requireMember } from "./workshops";
import { notifyApprovalRequest, notifyCheckIn, notifyVisitUpdate, notifyWorkshop } from "@/lib/notify";
import type { Car, ServiceVisit, Workshop } from "@/db/schema";

const { serviceVisits, visitEvents, workItems, visitSubscribers, cars } = schema;

/**
 * Who is acting on a visit:
 * - staff:    a member of the visit's workshop — runs the job
 * - owner:    the Torque user whose car the job is attached to — watches, approves, writes notes
 * - customer: whoever holds the tracking link — same as owner, for walk-ins
 * - subscriber: a Telegram chat following the job via the tracking link (approvals from the bot)
 */
export type Actor =
  | { kind: "staff"; userId: string }
  | { kind: "owner"; userId: string; via?: "web" | "bot" | "ai" }
  | { kind: "customer"; token: string }
  | { kind: "subscriber"; chatId: string };

type LoadedVisit = ServiceVisit & { car: Car | null; workshop: Workshop | null };

async function loadVisit(actor: Actor, visitId: string): Promise<LoadedVisit & { staffName?: string }> {
  const visit = await db.query.serviceVisits.findFirst({
    where: eq(serviceVisits.id, visitId),
    with: { car: true, workshop: true },
  });
  if (!visit) notFound("Visit");
  switch (actor.kind) {
    case "staff": {
      if (!visit.workshopId || !(await membership(actor.userId, visit.workshopId))) notFound("Visit");
      const u = await db.query.user.findFirst({ where: eq(schema.user.id, actor.userId), columns: { name: true } });
      return { ...visit, staffName: u?.name };
    }
    case "owner":
      if (!visit.car || visit.car.userId !== actor.userId) notFound("Visit");
      return visit;
    case "customer":
      if (visit.shareToken !== actor.token || !visit.shareEnabled) notFound("Visit");
      return visit;
    case "subscriber": {
      const sub = await db.query.visitSubscribers.findFirst({
        where: and(eq(visitSubscribers.visitId, visitId), eq(visitSubscribers.telegramChatId, actor.chatId)),
      });
      if (!sub) notFound("Visit");
      return visit;
    }
  }
}

function requireStaff(actor: Actor): asserts actor is { kind: "staff"; userId: string } {
  if (actor.kind !== "staff") throw new AppError("forbidden", "Only the workshop can do this");
}

const authorOf = (a: Actor) =>
  a.kind === "staff" ? "shop" : a.kind === "owner" ? (a.via === "bot" ? "bot" : a.via === "ai" ? "ai" : "owner") : a.kind === "subscriber" ? "bot" : "customer";

const isClosed = (v: { status: string }) => v.status === "completed" || v.status === "cancelled";

/** Display name of the vehicle on a job, from the linked car or the snapshot. */
export function vehicleLabel(v: Pick<ServiceVisit, "vehicleMake" | "vehicleModel" | "vehiclePlate"> & { car?: Pick<Car, "nickname" | "make" | "model"> | null }) {
  if (v.car) return v.car.nickname || `${v.car.make} ${v.car.model}`;
  return [v.vehicleMake, v.vehicleModel].filter(Boolean).join(" ") || v.vehiclePlate || "—";
}

/* ───────────── Creating jobs (workshop) ───────────── */

const jobBase = z.object({
  title: z.string().trim().min(1).max(120),
  eta: z.coerce.date().optional().nullable(),
  odometer: z.coerce.number().int().min(0).max(5_000_000).optional().nullable(),
});

const walkInInput = jobBase.extend({
  vehicleMake: z.string().trim().min(1).max(60),
  vehicleModel: z.string().trim().max(60).optional().nullable().transform((v) => v || null),
  vehicleYear: z.coerce.number().int().min(1900).max(2100).optional().nullable(),
  vehiclePlate: z.string().trim().toUpperCase().max(16).optional().nullable().transform((v) => v || null),
  customerName: z.string().trim().max(80).optional().nullable().transform((v) => v || null),
  customerPhone: z.string().trim().max(40).optional().nullable().transform((v) => v || null),
});

/** What the mechanic sees before confirming a check-in (only after the owner showed the code). */
export async function previewCheckIn(userId: string, workshopId: string, code: string) {
  await requireMember(userId, workshopId);
  const car = await findCarByCheckinCode(code);
  if (!car) return null;
  return { make: car.make, model: car.model, year: car.year, plate: car.plate, color: car.accentColor, photoUrl: car.photoUrl, fuel: car.fuel, odometer: car.currentOdometer };
}

export async function checkInByCode(userId: string, workshopId: string, code: string, raw: unknown) {
  const { workshop } = await requireMember(userId, workshopId);
  const data = jobBase.parse(raw);
  const car = await findCarByCheckinCode(code);
  if (!car) throw new AppError("invalid", "This code is not valid anymore. Ask the customer to show it again.");
  const ownerSettings = await db.query.userSettings.findFirst({ where: eq(schema.userSettings.userId, car.userId) });
  const [visit] = await db
    .insert(serviceVisits)
    .values({
      carId: car.id,
      workshopId,
      title: data.title,
      eta: data.eta ?? null,
      status: "dropped_off",
      odometer: data.odometer ?? car.currentOdometer,
      vehicleMake: car.make,
      vehicleModel: car.model,
      vehicleYear: car.year,
      vehiclePlate: car.plate,
      vehicleVin: car.vin,
      shopName: workshop.name,
      shopContact: workshop.phone,
      shareToken: nanoid(21),
      currency: ownerSettings?.currency ?? "UAH",
    })
    .returning();
  // Codes are single-use: whoever saw this one can't attach another job.
  await rotateCheckinCode(car.id);
  const name = (await db.query.user.findFirst({ where: eq(schema.user.id, userId), columns: { name: true } }))?.name;
  await db.insert(visitEvents).values({ visitId: visit.id, kind: "status", author: "shop", authorName: name, status: "dropped_off" });
  await bumpOdometer(car.id, data.odometer, "service");
  await notifyCheckIn({ ...visit, car, workshop });
  return visit;
}

export async function createWalkIn(userId: string, workshopId: string, raw: unknown) {
  const { workshop } = await requireMember(userId, workshopId);
  const data = walkInInput.parse(raw);
  const [visit] = await db
    .insert(serviceVisits)
    .values({
      ...data,
      eta: data.eta ?? null,
      workshopId,
      status: "dropped_off",
      shopName: workshop.name,
      shopContact: workshop.phone,
      shareToken: nanoid(21),
    })
    .returning();
  const name = (await db.query.user.findFirst({ where: eq(schema.user.id, userId), columns: { name: true } }))?.name;
  await db.insert(visitEvents).values({ visitId: visit.id, kind: "status", author: "shop", authorName: name, status: "dropped_off" });
  return visit;
}

export async function updateJob(actor: Actor, visitId: string, raw: unknown) {
  requireStaff(actor);
  const visit = await loadVisit(actor, visitId);
  const patch = walkInInput.partial().parse(raw);
  // Vehicle details of a linked car come from the owner's garage.
  if (visit.carId) {
    delete patch.vehicleMake;
    delete patch.vehicleModel;
    delete patch.vehicleYear;
    delete patch.vehiclePlate;
  }
  const [v] = await db.update(serviceVisits).set(patch).where(eq(serviceVisits.id, visitId)).returning();
  return v;
}

/* ───────────── Reading ───────────── */

/** Visits on the owner's cars (read-only list). */
export async function listVisits(userId: string, opts: { carId?: string; activeOnly?: boolean } = {}) {
  const userCars = opts.carId ? [await getCar(userId, opts.carId)] : await listCars(userId, { includeArchived: true });
  if (!userCars.length) return [];
  const conds = [inArray(serviceVisits.carId, userCars.map((c) => c.id))];
  if (opts.activeOnly) conds.push(notInArray(serviceVisits.status, ["completed", "cancelled"]));
  const rows = await db.query.serviceVisits.findMany({
    where: and(...conds),
    with: { car: true, workshop: true, workItems: { columns: { cost: true, approved: true } } },
    orderBy: [desc(serviceVisits.updatedAt)],
    limit: 100,
  });
  // Inner list is filtered by owned car ids, so car is always present here.
  return rows as (typeof rows[number] & { car: Car })[];
}

export type BoardFilter = "active" | "waiting" | "ready" | "done";

export async function listWorkshopBoard(userId: string, workshopId: string, opts: { filter?: BoardFilter; q?: string } = {}) {
  await requireMember(userId, workshopId);
  const conds = [eq(serviceVisits.workshopId, workshopId)];
  const filter = opts.filter ?? "active";
  if (filter === "active") conds.push(notInArray(serviceVisits.status, ["completed", "cancelled"]));
  if (filter === "waiting") conds.push(inArray(serviceVisits.status, ["awaiting_approval", "waiting_parts"]));
  if (filter === "ready") conds.push(eq(serviceVisits.status, "ready"));
  if (filter === "done") conds.push(inArray(serviceVisits.status, ["completed", "cancelled"]));
  if (opts.q?.trim()) {
    const q = `%${opts.q.trim().replace(/[%_]/g, "")}%`;
    conds.push(or(ilike(serviceVisits.vehiclePlate, q), ilike(serviceVisits.customerName, q), ilike(serviceVisits.title, q), ilike(serviceVisits.vehicleMake, q))!);
  }
  return db.query.serviceVisits.findMany({
    where: and(...conds),
    with: { car: { columns: { nickname: true, make: true, model: true, accentColor: true, photoUrl: true, fuel: true } }, workItems: { columns: { cost: true, approved: true } } },
    orderBy: [desc(serviceVisits.updatedAt)],
    limit: 100,
  });
}

async function fullVisit(visitId: string) {
  return (await db.query.serviceVisits.findFirst({
    where: eq(serviceVisits.id, visitId),
    with: {
      car: true,
      workshop: true,
      events: { orderBy: [asc(visitEvents.createdAt)] },
      workItems: { orderBy: [asc(workItems.createdAt)] },
    },
  }))!;
}

/** Owner view (their car). */
export async function getVisit(userId: string, visitId: string) {
  await loadVisit({ kind: "owner", userId }, visitId);
  return fullVisit(visitId);
}

/** Workshop view. */
export async function getJob(userId: string, visitId: string) {
  await loadVisit({ kind: "staff", userId }, visitId);
  return fullVisit(visitId);
}

/** Customer tracking link view: no owner data, no VIN. */
export async function getVisitByToken(token: string) {
  const visit = await db.query.serviceVisits.findFirst({
    where: and(eq(serviceVisits.shareToken, token), eq(serviceVisits.shareEnabled, true)),
  });
  if (!visit) return null;
  const full = await fullVisit(visit.id);
  const { car } = full;
  return {
    ...full,
    vehicleVin: null,
    car: car
      ? { nickname: car.nickname, make: car.make, model: car.model, year: car.year, plate: car.plate, accentColor: car.accentColor, photoUrl: car.photoUrl, fuel: car.fuel }
      : null,
  };
}

/* ───────────── Running the job (workshop) ───────────── */

export async function changeStatus(actor: Actor, visitId: string, rawTo: unknown, message?: string | null) {
  requireStaff(actor);
  const to = statusInput.parse(rawTo) as VisitStatusValue;
  const visit = await loadVisit(actor, visitId);
  if (!canTransition(visit.status, to)) throw new AppError("invalid", `Can't move from ${visit.status} to ${to}`);

  const patch: Partial<ServiceVisit> = { status: to };
  if (to === "completed") patch.completedAt = new Date();
  await db.update(serviceVisits).set(patch).where(eq(serviceVisits.id, visitId));
  await db.insert(visitEvents).values({ visitId, kind: "status", author: "shop", authorName: visit.staffName, status: to, message: message?.trim() || null });

  if (to === "completed") await finalizeVisit(visitId);
  if (to === "cancelled") {
    await db.delete(workItems).where(and(eq(workItems.visitId, visitId), eq(workItems.approved, false)));
  }
  await notifyVisitUpdate({ ...visit, status: to }, { message, total: to === "ready" || to === "completed" ? await approvedTotal(visitId) : undefined });
  return to;
}

async function approvedTotal(visitId: string) {
  const items = await db.query.workItems.findMany({ where: and(eq(workItems.visitId, visitId), eq(workItems.approved, true)), columns: { cost: true, approved: true } });
  return visitTotal(items);
}

/**
 * Completing a visit posts its approved work into the owner's service book and
 * updates maintenance counters. Walk-in jobs (no car yet) do this when claimed.
 */
async function finalizeVisit(visitId: string) {
  const visit = (await db.query.serviceVisits.findFirst({ where: eq(serviceVisits.id, visitId) }))!;
  await db.delete(workItems).where(and(eq(workItems.visitId, visitId), eq(workItems.approved, false)));
  if (!visit.carId) return;
  const items = await db.query.workItems.findMany({ where: and(eq(workItems.visitId, visitId), eq(workItems.approved, true)) });
  const performedAt = visit.completedAt ?? new Date();
  for (const item of items) {
    const odometer = item.odometer ?? visit.odometer;
    await db.update(workItems).set({ performedAt, odometer, carId: visit.carId }).where(eq(workItems.id, item.id));
    const planId = await resetPlanFromWork(visit.carId, { ...item, performedAt, odometer });
    if (planId && !item.maintenancePlanId) {
      await db.update(workItems).set({ maintenancePlanId: planId }).where(eq(workItems.id, item.id));
    }
  }
  await bumpOdometer(visit.carId, visit.odometer, "service");
}

export async function addVisitWork(actor: Actor, visitId: string, raw: unknown, opts: { pendingApproval?: boolean } = {}) {
  requireStaff(actor);
  const visit = await loadVisit(actor, visitId);
  if (isClosed(visit)) throw new AppError("invalid", "Visit is closed");
  const data = workInput.parse({ ...(raw as object), carId: visit.carId ?? "walk-in", visitId });
  const [item] = await db
    .insert(workItems)
    .values({
      ...data,
      carId: visit.carId,
      visitId,
      approved: !opts.pendingApproval,
      diy: false,
      quantity: String(data.quantity),
      cost: String(data.cost),
      currency: visit.currency,
      odometer: data.odometer ?? visit.odometer,
    })
    .returning();
  if (!opts.pendingApproval) {
    await db.insert(visitEvents).values({ visitId, kind: "work", author: "shop", authorName: visit.staffName, message: data.name, amount: String(data.cost) });
    await db.update(serviceVisits).set({ updatedAt: new Date() }).where(eq(serviceVisits.id, visitId));
  }
  return item;
}

export async function removeVisitWork(actor: Actor, visitId: string, workId: string) {
  requireStaff(actor);
  const visit = await loadVisit(actor, visitId);
  if (isClosed(visit)) throw new AppError("invalid", "Visit is closed");
  await db.delete(workItems).where(and(eq(workItems.id, workId), eq(workItems.visitId, visitId)));
}

/** The workshop proposes extra work; the owner or customer approves it (app, link or Telegram). */
export async function requestApproval(actor: Actor, visitId: string, input: { message: string; items: unknown[] }) {
  requireStaff(actor);
  const visit = await loadVisit(actor, visitId);
  if (!input.items.length) throw new AppError("invalid", "Add at least one item");
  const created = [];
  for (const raw of input.items) created.push(await addVisitWork(actor, visitId, raw, { pendingApproval: true }));
  const amount = created.reduce((a, i) => a + Number(i.cost), 0);
  const [event] = await db
    .insert(visitEvents)
    .values({
      visitId,
      kind: "approval_request",
      author: "shop",
      authorName: visit.staffName,
      message: input.message.trim() || null,
      amount: String(amount),
      data: { itemIds: created.map((i) => i.id), decided: false },
    })
    .returning();
  if (canTransition(visit.status, "awaiting_approval")) {
    await db.update(serviceVisits).set({ status: "awaiting_approval" }).where(eq(serviceVisits.id, visitId));
    await db.insert(visitEvents).values({ visitId, kind: "status", author: "shop", authorName: visit.staffName, status: "awaiting_approval" });
  }
  await notifyApprovalRequest(visit, event, created);
  return event;
}

/* ───────────── Owner / customer side ───────────── */

export async function addNote(actor: Actor, visitId: string, message: string, photoUrl?: string | null) {
  const visit = await loadVisit(actor, visitId);
  if (actor.kind !== "staff" && photoUrl) throw new AppError("forbidden", "Only the workshop can add photos");
  const text = message.trim().slice(0, 2000);
  if (!text && !photoUrl) throw new AppError("invalid", "Empty note");
  const [event] = await db
    .insert(visitEvents)
    .values({
      visitId,
      kind: photoUrl ? "photo" : "note",
      author: authorOf(actor),
      authorName: actor.kind === "staff" ? visit.staffName : null,
      message: text || null,
      photoUrl,
    })
    .returning();
  await db.update(serviceVisits).set({ updatedAt: new Date() }).where(eq(serviceVisits.id, visitId));
  if (actor.kind === "staff") await notifyVisitUpdate(visit, { message: text, photo: !!photoUrl });
  else await notifyWorkshop(visit, { kind: "note", message: text });
  return event;
}

export async function decideApproval(actor: Actor, eventId: string, approved: boolean) {
  if (actor.kind === "staff") throw new AppError("forbidden", "The customer decides on extra work");
  const event = await db.query.visitEvents.findFirst({ where: eq(visitEvents.id, eventId) });
  if (!event || event.kind !== "approval_request") notFound("Approval");
  const visit = await loadVisit(actor, event.visitId);
  const data = (event.data ?? {}) as { itemIds?: string[]; decided?: boolean; approved?: boolean };
  if (data.decided) return { alreadyDecided: true, approved: data.approved ?? false };
  const ids = data.itemIds ?? [];
  if (ids.length) {
    if (approved) {
      await db.update(workItems).set({ approved: true }).where(and(inArray(workItems.id, ids), eq(workItems.visitId, visit.id)));
    } else {
      await db.delete(workItems).where(and(inArray(workItems.id, ids), eq(workItems.visitId, visit.id)));
    }
  }
  await db
    .update(visitEvents)
    .set({ data: { ...data, decided: true, approved, decidedAt: new Date().toISOString() } })
    .where(eq(visitEvents.id, eventId));
  await db.insert(visitEvents).values({
    visitId: visit.id,
    kind: "approval_decision",
    author: authorOf(actor),
    amount: event.amount,
    data: { approved, requestId: eventId },
  });
  if (visit.status === "awaiting_approval") {
    await db.update(serviceVisits).set({ status: "in_progress" }).where(eq(serviceVisits.id, visit.id));
    await db.insert(visitEvents).values({ visitId: visit.id, kind: "status", author: authorOf(actor), status: "in_progress" });
  }
  await notifyWorkshop(visit, { kind: "approval", approved, amount: Number(event.amount ?? 0) });
  return { alreadyDecided: false, approved };
}

/** "Not my car": the owner detaches a job that was checked in to their car by mistake. */
export async function detachVisit(userId: string, visitId: string) {
  const visit = await loadVisit({ kind: "owner", userId }, visitId);
  await db.update(serviceVisits).set({ carId: null }).where(eq(serviceVisits.id, visitId));
  await db.update(workItems).set({ carId: null }).where(eq(workItems.visitId, visitId));
  await db.insert(visitEvents).values({ visitId, kind: "note", author: "owner", message: "⚠️ The car owner says this is not their car. The job was detached from their garage." });
  await rotateCheckinCode(visit.car!.id);
  await notifyWorkshop(visit, { kind: "detached" });
}

/** A walk-in customer saves the job into their Torque garage (existing car or a new one). */
export async function claimVisit(token: string, userId: string, opts: { carId?: string | null } = {}) {
  const visit = await loadVisit({ kind: "customer", token }, (await idForToken(token)) ?? "");
  if (visit.carId) throw new AppError("invalid", "This visit is already saved to a garage");
  let carId = opts.carId ?? null;
  if (carId) {
    await getCar(userId, carId);
  } else {
    const [car] = await db
      .insert(cars)
      .values({
        userId,
        make: visit.vehicleMake || "Car",
        model: visit.vehicleModel || "",
        year: visit.vehicleYear,
        plate: visit.vehiclePlate,
        currentOdometer: visit.odometer ?? 0,
      })
      .returning();
    carId = car.id;
  }
  await db.update(serviceVisits).set({ carId }).where(eq(serviceVisits.id, visit.id));
  await db.update(workItems).set({ carId }).where(eq(workItems.visitId, visit.id));
  if (visit.status === "completed") await finalizeVisit(visit.id);
  return { carId, visitId: visit.id };
}

async function idForToken(token: string) {
  const v = await db.query.serviceVisits.findFirst({ where: eq(serviceVisits.shareToken, token), columns: { id: true } });
  return v?.id ?? null;
}

/** Follow a job from Telegram without an account. */
export async function subscribeTelegram(token: string, chatId: string, locale: "en" | "uk") {
  const id = await idForToken(token);
  if (!id) return null;
  const visit = await loadVisit({ kind: "customer", token }, id);
  await db.insert(visitSubscribers).values({ visitId: visit.id, telegramChatId: chatId, locale }).onConflictDoNothing();
  return visit;
}

export async function setSharing(actor: Actor, visitId: string, opts: { enabled?: boolean; regenerate?: boolean }) {
  requireStaff(actor);
  await loadVisit(actor, visitId);
  const patch: Partial<ServiceVisit> = {};
  if (opts.enabled != null) patch.shareEnabled = opts.enabled;
  if (opts.regenerate) patch.shareToken = nanoid(21);
  const [v] = await db.update(serviceVisits).set(patch).where(eq(serviceVisits.id, visitId)).returning();
  return v;
}

export function visitTotal(items: { cost: string; approved: boolean }[]) {
  return items.filter((i) => i.approved).reduce((a, i) => a + Number(i.cost), 0);
}

export async function activeVisitsByCar(userId: string) {
  const visits = await listVisits(userId, { activeOnly: true });
  const map = new Map<string, (typeof visits)[number]>();
  for (const v of visits) if (v.carId && !map.has(v.carId)) map.set(v.carId, v);
  return map;
}

