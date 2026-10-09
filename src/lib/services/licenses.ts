import "server-only";
import { createHash } from "node:crypto";
import { and, count, desc, eq, gte, inArray } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { AppError } from "@/lib/errors";
import { hit } from "@/lib/rate-limit";
import { computeEntitlements, newLicenseKey, nextExpiry, normalizeLicenseKey, PRO_DEFAULT_SEATS, type Entitlements } from "@/lib/plans";
import { requireMember } from "./workshops";

const { licenses, workshops, workshopMembers, serviceVisits, visitEvents } = schema;

const hashKey = (key: string) => createHash("sha256").update(key).digest("hex");

/* ───────────── Entitlements & usage ───────────── */

export async function getEntitlements(workshopId: string): Promise<Entitlements> {
  const rows = await db.query.licenses.findMany({
    where: and(eq(licenses.workshopId, workshopId), eq(licenses.status, "active")),
    columns: { status: true, seats: true, expiresAt: true },
  });
  return computeEntitlements(rows);
}

function monthStart(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function jobsThisMonth(workshopId: string) {
  const [r] = await db
    .select({ n: count() })
    .from(serviceVisits)
    .where(and(eq(serviceVisits.workshopId, workshopId), gte(serviceVisits.createdAt, monthStart())));
  return r.n;
}

export async function seatsUsed(workshopId: string) {
  const [r] = await db.select({ n: count() }).from(workshopMembers).where(eq(workshopMembers.workshopId, workshopId));
  return r.n;
}

/* ───────────── Limit checks (no-ops when billing is off) ───────────── */

export async function assertCanCreateJob(workshopId: string) {
  const e = await getEntitlements(workshopId);
  if (e.jobsPerMonth != null && (await jobsThisMonth(workshopId)) >= e.jobsPerMonth) {
    throw new AppError("limit", `The Free plan includes ${e.jobsPerMonth} new jobs per month. Upgrade to Pro for unlimited jobs.`);
  }
}

export async function assertCanAddMember(workshopId: string) {
  const e = await getEntitlements(workshopId);
  if ((await seatsUsed(workshopId)) >= e.seats) {
    throw new AppError("limit", e.plan === "pro" ? `Your Pro license covers ${e.seats} team members.` : `The Free plan includes ${e.seats} team members. Upgrade to Pro to add more mechanics.`);
  }
}

export async function assertCanAddPhoto(workshopId: string, visitId: string) {
  const e = await getEntitlements(workshopId);
  const [r] = await db.select({ n: count() }).from(visitEvents).where(and(eq(visitEvents.visitId, visitId), eq(visitEvents.kind, "photo")));
  if (r.n >= e.photosPerJob) {
    throw new AppError("limit", e.plan === "pro" ? `Up to ${e.photosPerJob} photos per job.` : `The Free plan includes ${e.photosPerJob} photos per job. Upgrade to Pro for more.`);
  }
}

/* ───────────── Shop owner ───────────── */

export async function planStatus(userId: string, workshopId: string) {
  await requireMember(userId, workshopId);
  const [entitlements, jobs, seats, history] = await Promise.all([
    getEntitlements(workshopId),
    jobsThisMonth(workshopId),
    seatsUsed(workshopId),
    db.query.licenses.findMany({
      where: eq(licenses.workshopId, workshopId),
      orderBy: [desc(licenses.activatedAt)],
      columns: { id: true, keyHint: true, seats: true, durationDays: true, activatedAt: true, expiresAt: true, status: true },
      limit: 10,
    }),
  ]);
  return { entitlements, usage: { jobs, seats }, history };
}

export async function activateLicense(userId: string, workshopId: string, rawKey: string) {
  await requireMember(userId, workshopId, "owner");
  if (!(await hit(`license:${userId}`, 10, 60 * 60))) throw new AppError("rate_limited", "Too many attempts. Try again in an hour.");
  const key = normalizeLicenseKey(rawKey);
  if (!key) throw new AppError("invalid", "That doesn't look like a Torque license key (TQ-PRO-XXXX-XXXX-XXXX).");
  const license = await db.query.licenses.findFirst({ where: eq(licenses.keyHash, hashKey(key)) });
  if (!license) throw new AppError("invalid", "License key not found. Check it and try again.");
  if (license.status === "revoked") throw new AppError("invalid", "This license key was revoked.");
  if (license.status === "active") throw new AppError("invalid", "This license key was already used.");

  const current = await getEntitlements(workshopId);
  const expiresAt = nextExpiry(current.plan === "pro" ? current.expiresAt : null, license.durationDays);
  // Single use even under concurrent attempts.
  const [activated] = await db
    .update(licenses)
    .set({ status: "active", workshopId, activatedBy: userId, activatedAt: new Date(), expiresAt })
    .where(and(eq(licenses.id, license.id), eq(licenses.status, "new")))
    .returning();
  if (!activated) throw new AppError("invalid", "This license key was already used.");
  return activated;
}

/* ───────────── Admin ───────────── */

const generateInput = z.object({
  seats: z.coerce.number().int().min(1).max(100).default(PRO_DEFAULT_SEATS),
  months: z.coerce.number().int().min(1).max(36),
  quantity: z.coerce.number().int().min(1).max(50).default(1),
  note: z.string().trim().max(200).optional().nullable().transform((v) => v || null),
});

/** Returns the plaintext keys — the only time they exist outside the buyer's hands. */
export async function generateLicenses(adminId: string, raw: unknown) {
  const { seats, months, quantity, note } = generateInput.parse(raw);
  const durationDays = Math.round(months * 30.44);
  const keys: string[] = [];
  for (let i = 0; i < quantity; i++) {
    const key = newLicenseKey();
    await db.insert(licenses).values({ keyHash: hashKey(key), keyHint: key.slice(-4), seats, durationDays, note, createdBy: adminId });
    keys.push(key);
  }
  return keys;
}

export async function revokeLicense(licenseId: string) {
  const [row] = await db.update(licenses).set({ status: "revoked" }).where(eq(licenses.id, licenseId)).returning();
  if (!row) throw new AppError("not_found", "License not found");
  return row;
}

export async function listLicenses(filter: { status?: "new" | "active" | "revoked" } = {}) {
  return db
    .select({ license: licenses, workshopName: workshops.name })
    .from(licenses)
    .leftJoin(workshops, eq(workshops.id, licenses.workshopId))
    .where(filter.status ? eq(licenses.status, filter.status) : undefined)
    .orderBy(desc(licenses.createdAt))
    .limit(300);
}

export async function workshopOverview() {
  const all = await db.query.workshops.findMany({ orderBy: [desc(workshops.createdAt)], limit: 300 });
  if (!all.length) return [];
  const ids = all.map((w) => w.id);
  const [lic, members, jobs] = await Promise.all([
    db.query.licenses.findMany({ where: and(inArray(licenses.workshopId, ids), eq(licenses.status, "active")), columns: { workshopId: true, status: true, seats: true, expiresAt: true } }),
    db.select({ id: workshopMembers.workshopId, n: count() }).from(workshopMembers).where(inArray(workshopMembers.workshopId, ids)).groupBy(workshopMembers.workshopId),
    db
      .select({ id: serviceVisits.workshopId, n: count() })
      .from(serviceVisits)
      .where(and(inArray(serviceVisits.workshopId, ids), gte(serviceVisits.createdAt, monthStart())))
      .groupBy(serviceVisits.workshopId),
  ]);
  return all.map((w) => ({
    workshop: w,
    entitlements: computeEntitlements(lic.filter((l) => l.workshopId === w.id)),
    members: members.find((m) => m.id === w.id)?.n ?? 0,
    jobsThisMonth: jobs.find((j) => j.id === w.id)?.n ?? 0,
  }));
}
