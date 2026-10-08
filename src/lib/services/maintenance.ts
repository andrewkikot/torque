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

/**
 * When work is recorded, reset the matching plan's counters.
 * Matches by explicit plan id, or by category when exactly one active plan has it.
 */
export async function resetPlanFromWork(
  carId: string,
  work: { maintenancePlanId?: string | null; category: WorkCategory; performedAt: Date; odometer: number | null },
) {
  let plan: MaintenancePlan | undefined;
  if (work.maintenancePlanId) {
    plan = await db.query.maintenancePlans.findFirst({
      where: and(eq(maintenancePlans.id, work.maintenancePlanId), eq(maintenancePlans.carId, carId)),
    });
  } else {
    const candidates = await db.query.maintenancePlans.findMany({
      where: and(
        eq(maintenancePlans.carId, carId),
        eq(maintenancePlans.category, work.category),
        eq(maintenancePlans.active, true),
      ),
    });
    if (candidates.length === 1) plan = candidates[0];
  }
  if (!plan) return null;
  // Don't move counters backwards when logging old history.
  if (plan.lastDoneAt && plan.lastDoneAt > work.performedAt) return plan.id;
  await db
    .update(maintenancePlans)
    .set({ lastDoneAt: work.performedAt, lastDoneOdometer: work.odometer ?? plan.lastDoneOdometer })
    .where(eq(maintenancePlans.id, plan.id));
  return plan.id;
}
