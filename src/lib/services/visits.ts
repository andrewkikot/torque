import "server-only";
import { and, asc, desc, eq, inArray, notInArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, schema } from "@/db";
import { AppError, notFound } from "@/lib/errors";
import { visitInput, workInput, statusInput } from "@/lib/validation";
import { canTransition, SHOP_STATUSES, type VisitStatusValue } from "@/lib/domain/visit-status";
import { bumpOdometer, getCar, listCars } from "./cars";
import { resetPlanFromWork } from "./maintenance";
import { notifyApprovalRequest, notifyVisitUpdate } from "@/lib/notify";
import type { ServiceVisit } from "@/db/schema";

const { serviceVisits, visitEvents, workItems } = schema;

/** Who is acting on a visit. Owners act via session/bot/AI; shops via the share token. */
export type Actor =
  | { kind: "owner"; userId: string; via?: "web" | "bot" | "ai" }
  | { kind: "shop"; token: string };

const authorOf = (a: Actor) => (a.kind === "shop" ? "shop" : a.via === "bot" ? "bot" : a.via === "ai" ? "ai" : "owner");

async function loadVisit(actor: Actor, visitId: string) {
  const visit = await db.query.serviceVisits.findFirst({
    where: eq(serviceVisits.id, visitId),
    with: { car: true },
  });
  if (!visit) notFound("Visit");
  if (actor.kind === "owner" && visit.car.userId !== actor.userId) notFound("Visit");
  if (actor.kind === "shop" && (visit.shareToken !== actor.token || !visit.shareEnabled)) notFound("Visit");
  return visit;
}

export async function createVisit(userId: string, raw: unknown) {
  const data = visitInput.parse(raw);
  const car = await getCar(userId, data.carId);
  const settings = await db.query.userSettings.findFirst({ where: eq(schema.userSettings.userId, userId) });
  const [visit] = await db
    .insert(serviceVisits)
    .values({
      ...data,
      odometer: data.odometer ?? car.currentOdometer,
      shareToken: nanoid(21),
      currency: settings?.currency ?? "UAH",
    })
    .returning();
  await db.insert(visitEvents).values({ visitId: visit.id, kind: "status", author: "owner", status: visit.status });
  await bumpOdometer(car.id, data.odometer, "service");
  return visit;
}

export async function updateVisitDetails(userId: string, visitId: string, raw: unknown) {
  await loadVisit({ kind: "owner", userId }, visitId);
  const data = visitInput.omit({ carId: true, status: true }).partial().parse(raw);
  const [visit] = await db.update(serviceVisits).set(data).where(eq(serviceVisits.id, visitId)).returning();
  return visit;
}

export async function deleteVisit(userId: string, visitId: string) {
  await loadVisit({ kind: "owner", userId }, visitId);
  await db.delete(workItems).where(and(eq(workItems.visitId, visitId), eq(workItems.approved, false)));
  await db.delete(serviceVisits).where(eq(serviceVisits.id, visitId));
}

export async function setSharing(userId: string, visitId: string, opts: { enabled?: boolean; regenerate?: boolean }) {
  await loadVisit({ kind: "owner", userId }, visitId);
  const patch: Partial<ServiceVisit> = {};
  if (opts.enabled != null) patch.shareEnabled = opts.enabled;
  if (opts.regenerate) patch.shareToken = nanoid(21);
  const [v] = await db.update(serviceVisits).set(patch).where(eq(serviceVisits.id, visitId)).returning();
  return v;
}

export async function listVisits(userId: string, opts: { carId?: string; activeOnly?: boolean } = {}) {
  const userCars = opts.carId ? [await getCar(userId, opts.carId)] : await listCars(userId, { includeArchived: true });
  if (!userCars.length) return [];
  const conds = [inArray(serviceVisits.carId, userCars.map((c) => c.id))];
  if (opts.activeOnly) conds.push(notInArray(serviceVisits.status, ["completed", "cancelled"]));
  return db.query.serviceVisits.findMany({
    where: and(...conds),
    with: { car: true, workItems: { columns: { cost: true, approved: true } } },
    orderBy: [desc(serviceVisits.updatedAt)],
    limit: 100,
  });
}

async function fullVisit(visitId: string) {
  return db.query.serviceVisits.findFirst({
    where: eq(serviceVisits.id, visitId),
    with: {
      car: true,
      events: { orderBy: [asc(visitEvents.createdAt)] },
      workItems: { orderBy: [asc(workItems.createdAt)] },
    },
  });
}

export async function getVisit(userId: string, visitId: string) {
  await loadVisit({ kind: "owner", userId }, visitId);
  return (await fullVisit(visitId))!;
}

export async function getVisitByToken(token: string) {
  const visit = await db.query.serviceVisits.findFirst({
    where: and(eq(serviceVisits.shareToken, token), eq(serviceVisits.shareEnabled, true)),
  });
  if (!visit) return null;
  const full = (await fullVisit(visit.id))!;
  // Shops see the car basics only — no VIN, no owner info.
  const { car } = full;
  return {
    ...full,
    car: {
      make: car.make,
      model: car.model,
      year: car.year,
      plate: car.plate,
      nickname: car.nickname,
      accentColor: car.accentColor,
      photoUrl: car.photoUrl,
      fuel: car.fuel,
    },
  };
}

export async function changeStatus(actor: Actor, visitId: string, rawTo: unknown, message?: string | null) {
  const to = statusInput.parse(rawTo) as VisitStatusValue;
  const visit = await loadVisit(actor, visitId);
  if (actor.kind === "shop" && !SHOP_STATUSES.includes(to)) throw new AppError("forbidden", "Shops can't set this status");
  if (!canTransition(visit.status, to)) throw new AppError("invalid", `Can't move from ${visit.status} to ${to}`);

  const patch: Partial<ServiceVisit> = { status: to };
  if (to === "completed") patch.completedAt = new Date();
  await db.update(serviceVisits).set(patch).where(eq(serviceVisits.id, visitId));
  await db.insert(visitEvents).values({
    visitId,
    kind: "status",
    author: authorOf(actor),
    status: to,
    message: message?.trim() || null,
  });

  if (to === "completed") await finalizeVisit(visitId);
  if (to === "cancelled") {
    await db.delete(workItems).where(and(eq(workItems.visitId, visitId), eq(workItems.approved, false)));
  }
  if (actor.kind === "shop") await notifyVisitUpdate(visit.car.userId, { ...visit, status: to }, { message });
  return to;
}

/** Completing a visit posts its approved work into the service book and updates maintenance counters. */
async function finalizeVisit(visitId: string) {
  const visit = (await db.query.serviceVisits.findFirst({ where: eq(serviceVisits.id, visitId) }))!;
  const items = await db.query.workItems.findMany({
    where: and(eq(workItems.visitId, visitId), eq(workItems.approved, true)),
  });
  const performedAt = visit.completedAt ?? new Date();
  for (const item of items) {
    const odometer = item.odometer ?? visit.odometer;
    await db.update(workItems).set({ performedAt, odometer }).where(eq(workItems.id, item.id));
    const planId = await resetPlanFromWork(visit.carId, { ...item, performedAt, odometer });
    if (planId && !item.maintenancePlanId) {
      await db.update(workItems).set({ maintenancePlanId: planId }).where(eq(workItems.id, item.id));
    }
  }
  await db.delete(workItems).where(and(eq(workItems.visitId, visitId), eq(workItems.approved, false)));
  await bumpOdometer(visit.carId, visit.odometer, "service");
}

export async function addNote(actor: Actor, visitId: string, message: string, photoUrl?: string | null) {
  const visit = await loadVisit(actor, visitId);
  const text = message.trim().slice(0, 2000);
  if (!text && !photoUrl) throw new AppError("invalid", "Empty note");
  const [event] = await db
    .insert(visitEvents)
    .values({ visitId, kind: photoUrl ? "photo" : "note", author: authorOf(actor), message: text || null, photoUrl })
    .returning();
  await db.update(serviceVisits).set({ updatedAt: new Date() }).where(eq(serviceVisits.id, visitId));
  if (actor.kind === "shop") await notifyVisitUpdate(visit.car.userId, visit, { message: text, photo: !!photoUrl });
  return event;
}

export async function addVisitWork(actor: Actor, visitId: string, raw: unknown, opts: { pendingApproval?: boolean } = {}) {
  const visit = await loadVisit(actor, visitId);
  if (visit.status === "completed" || visit.status === "cancelled") throw new AppError("invalid", "Visit is closed");
  const data = workInput.parse({ ...(raw as object), carId: visit.carId, visitId });
  const [item] = await db
    .insert(workItems)
    .values({
      ...data,
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
    await db.insert(visitEvents).values({
      visitId,
      kind: "work",
      author: authorOf(actor),
      message: data.name,
      amount: String(data.cost),
    });
    await db.update(serviceVisits).set({ updatedAt: new Date() }).where(eq(serviceVisits.id, visitId));
  }
  return item;
}

export async function removeVisitWork(actor: Actor, visitId: string, workId: string) {
  const visit = await loadVisit(actor, visitId);
  if (visit.status === "completed") throw new AppError("invalid", "Visit is closed");
  await db.delete(workItems).where(and(eq(workItems.id, workId), eq(workItems.visitId, visitId)));
}

/** A shop proposes extra work; the owner must approve it (in app or Telegram). */
export async function requestApproval(
  actor: Actor,
  visitId: string,
  input: { message: string; items: unknown[] },
) {
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
      author: authorOf(actor),
      message: input.message.trim() || null,
      amount: String(amount),
      data: { itemIds: created.map((i) => i.id), decided: false },
    })
    .returning();
  if (canTransition(visit.status, "awaiting_approval")) {
    await db.update(serviceVisits).set({ status: "awaiting_approval" }).where(eq(serviceVisits.id, visitId));
    await db.insert(visitEvents).values({ visitId, kind: "status", author: authorOf(actor), status: "awaiting_approval" });
  }
  await notifyApprovalRequest(visit.car.userId, visit, event, created);
  return event;
}

export async function decideApproval(userId: string, eventId: string, approved: boolean, via: "web" | "bot" = "web") {
  const event = await db.query.visitEvents.findFirst({ where: eq(visitEvents.id, eventId) });
  if (!event || event.kind !== "approval_request") notFound("Approval");
  const visit = await loadVisit({ kind: "owner", userId }, event.visitId);
  const data = (event.data ?? {}) as { itemIds?: string[]; decided?: boolean };
  if (data.decided) return { alreadyDecided: true, approved: (data as { approved?: boolean }).approved ?? false };
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
    author: via === "bot" ? "bot" : "owner",
    amount: event.amount,
    data: { approved, requestId: eventId },
  });
  if (visit.status === "awaiting_approval") {
    await db.update(serviceVisits).set({ status: "in_progress" }).where(eq(serviceVisits.id, visit.id));
    await db.insert(visitEvents).values({ visitId: visit.id, kind: "status", author: "owner", status: "in_progress" });
  }
  return { alreadyDecided: false, approved };
}

export function visitTotal(items: { cost: string; approved: boolean }[]) {
  return items.filter((i) => i.approved).reduce((a, i) => a + Number(i.cost), 0);
}

export async function activeVisitsByCar(userId: string) {
  const visits = await listVisits(userId, { activeOnly: true });
  const map = new Map<string, (typeof visits)[number]>();
  for (const v of visits) if (!map.has(v.carId)) map.set(v.carId, v);
  return map;
}

