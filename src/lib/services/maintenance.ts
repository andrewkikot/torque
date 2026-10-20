import "server-only";
import { and, eq, desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { notFound } from "@/lib/errors";
import { planInput } from "@/lib/validation";
import { computeDue, estimateDailyDistance, healthScore, type DueInfo } from "@/lib/domain/maintenance";
import { getCar } from "./cars";
import type { Car, MaintenancePlan, WorkCategory } from "@/db/schema";

const { maintenancePlans, odometerReadings } = schema;

export type PlanWithDue = MaintenancePlan & { due: DueInfo };

export async function getDailyDistance(carId: string) {
  const readings = await db.query.odometerReadings.findMany({
    where: eq(odometerReadings.carId, carId),
    orderBy: [desc(odometerReadings.recordedAt)],
    limit: 100,
  });
  return estimateDailyDistance(readings);
}

export async function plansWithDue(car: Car): Promise<{ plans: PlanWithDue[]; dailyDistance: number; health: number | null }> {
  const [plans, dailyDistance] = await Promise.all([
    db.query.maintenancePlans.findMany({
      where: and(eq(maintenancePlans.carId, car.id), eq(maintenancePlans.active, true)),
    }),
    getDailyDistance(car.id),
  ]);
  const withDue = plans
    .map((p) => ({ ...p, due: computeDue(p, car.currentOdometer, dailyDistance) }))
    .sort((a, b) => (a.due.effectiveDaysLeft ?? 1e9) - (b.due.effectiveDaysLeft ?? 1e9));
  return { plans: withDue, dailyDistance, health: healthScore(withDue.map((p) => p.due.status)) };
}

export async function getUpcoming(userId: string, carId: string) {
  const car = await getCar(userId, carId);
  return { car, ...(await plansWithDue(car)) };
}

export async function addPlan(userId: string, raw: unknown) {
  const data = planInput.parse(raw);
  const car = await getCar(userId, data.carId);
  const [plan] = await db
    .insert(maintenancePlans)
    .values({
      ...data,
      lastDoneAt: data.lastDoneAt ?? new Date(),
      lastDoneOdometer: data.lastDoneOdometer ?? car.currentOdometer,
    })
    .returning();
  return plan;
}

async function getPlan(userId: string, planId: string) {
  const plan = await db.query.maintenancePlans.findFirst({ where: eq(maintenancePlans.id, planId) });
  if (!plan) notFound("Plan");
  await getCar(userId, plan.carId); // ownership
  return plan;
}

export async function updatePlan(userId: string, planId: string, raw: unknown) {
  const plan = await getPlan(userId, planId);
  const data = planInput.parse({ ...plan, ...(raw as object), carId: plan.carId });
  const [updated] = await db.update(maintenancePlans).set(data).where(eq(maintenancePlans.id, planId)).returning();
  return updated;
}

export async function deletePlan(userId: string, planId: string) {
  await getPlan(userId, planId);
  await db.delete(maintenancePlans).where(eq(maintenancePlans.id, planId));
}

type WorkLink = { maintenancePlanId?: string | null; category: WorkCategory };

/** The plan a work item counts towards: an explicit link, else the only active plan in its category. */
async function matchPlan(carId: string, work: WorkLink): Promise<MaintenancePlan | undefined> {
  if (work.maintenancePlanId) {
    return db.query.maintenancePlans.findFirst({
      where: and(eq(maintenancePlans.id, work.maintenancePlanId), eq(maintenancePlans.carId, carId)),
    });
  }
  const candidates = await db.query.maintenancePlans.findMany({
    where: and(
      eq(maintenancePlans.carId, carId),
      eq(maintenancePlans.category, work.category),
      eq(maintenancePlans.active, true),
    ),
  });
  return candidates.length === 1 ? candidates[0] : undefined;
}

export async function planIdForWork(carId: string, work: WorkLink) {
  return (await matchPlan(carId, work))?.id ?? null;
}

/**
 * Re-derive a plan's counters from the newest entry still linked to it. Unlike
 * resetPlanFromWork this can move them *backwards*, which is what editing or deleting
 * an entry needs. A plan with nothing left linked keeps the counters it has rather than
 * reverting to "never done" — we have no record to put there instead.
 */
export async function recomputePlan(planId: string) {
  const newest = await db.query.workItems.findFirst({
    where: and(eq(schema.workItems.maintenancePlanId, planId), eq(schema.workItems.approved, true)),
    orderBy: [desc(schema.workItems.performedAt)],
  });
  if (!newest) return;
  await db
    .update(maintenancePlans)
    .set({ lastDoneAt: newest.performedAt, ...(newest.odometer != null ? { lastDoneOdometer: newest.odometer } : {}) })
    .where(eq(maintenancePlans.id, planId));
}

/**
 * When work is recorded, reset the matching plan's counters.
 * Matches by explicit plan id, or by category when exactly one active plan has it.
 */
export async function resetPlanFromWork(
  carId: string,
  work: { maintenancePlanId?: string | null; category: WorkCategory; performedAt: Date; odometer: number | null },
) {
  const plan = await matchPlan(carId, work);
  if (!plan) return null;
  // Don't move counters backwards when logging old history.
  if (plan.lastDoneAt && plan.lastDoneAt > work.performedAt) return plan.id;
  await db
    .update(maintenancePlans)
    .set({ lastDoneAt: work.performedAt, lastDoneOdometer: work.odometer ?? plan.lastDoneOdometer })
    .where(eq(maintenancePlans.id, plan.id));
  return plan.id;
}
