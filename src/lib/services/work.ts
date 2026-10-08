import "server-only";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { notFound } from "@/lib/errors";
import { workInput } from "@/lib/validation";
import { bumpOdometer, getCar } from "./cars";
import { resetPlanFromWork } from "./maintenance";
import type { WorkCategory } from "@/db/schema";

const { workItems, serviceVisits } = schema;

export async function addWork(userId: string, raw: unknown, opts: { source?: "web" | "telegram" | "ai" } = {}) {
  const data = workInput.parse(raw);
  const car = await getCar(userId, data.carId);
  if (data.visitId) {
    const visit = await db.query.serviceVisits.findFirst({
      where: and(eq(serviceVisits.id, data.visitId), eq(serviceVisits.carId, car.id)),
    });
    if (!visit) notFound("Visit");
  }
  const performedAt = data.performedAt ?? new Date();
  const odometer = data.odometer ?? car.currentOdometer;
  const [item] = await db
    .insert(workItems)
    .values({
      ...data,
      performedAt,
      odometer,
      quantity: String(data.quantity),
      cost: String(data.cost),
      diy: data.diy || !data.visitId,
    })
    .returning();

  // Standalone work counts immediately; visit work counts when the visit completes.
  if (!data.visitId) {
    const planId = await resetPlanFromWork(car.id, { ...data, performedAt, odometer });
    if (planId && !item.maintenancePlanId) {
      await db.update(workItems).set({ maintenancePlanId: planId }).where(eq(workItems.id, item.id));
    }
    await bumpOdometer(car.id, data.odometer, opts.source === "telegram" ? "telegram" : opts.source === "ai" ? "ai" : "web");
  }
  return item;
}

export async function deleteWork(userId: string, workId: string) {
  const item = await db.query.workItems.findFirst({ where: eq(workItems.id, workId) });
  if (!item || !item.carId) notFound("Work item");
  await getCar(userId, item.carId);
  await db.delete(workItems).where(eq(workItems.id, workId));
}

export type HistoryFilter = { category?: WorkCategory; year?: number };

export async function listHistory(userId: string, carId: string, filter: HistoryFilter = {}) {
  await getCar(userId, carId);
  const conds = [eq(workItems.carId, carId), eq(workItems.approved, true)];
  if (filter.category) conds.push(eq(workItems.category, filter.category));
  if (filter.year) {
    conds.push(gte(workItems.performedAt, new Date(filter.year, 0, 1)));
    conds.push(lt(workItems.performedAt, new Date(filter.year + 1, 0, 1)));
  }
  return db.query.workItems.findMany({
    where: and(...conds),
    orderBy: [desc(workItems.performedAt), desc(workItems.createdAt)],
    with: { visit: { columns: { id: true, title: true, shopName: true, status: true } } },
    limit: 500,
  });
}

export async function historyStats(userId: string, carId: string) {
  const car = await getCar(userId, carId);
  const rows = await db
    .select({
      category: workItems.category,
      total: sql<string>`coalesce(sum(${workItems.cost} * 1), 0)`,
      count: sql<number>`count(*)::int`,
    })
    .from(workItems)
    .where(and(eq(workItems.carId, carId), eq(workItems.approved, true)))
    .groupBy(workItems.category);
  const [{ minOdo }] = await db
    .select({ minOdo: sql<number | null>`min(${workItems.odometer})` })
    .from(workItems)
    .where(eq(workItems.carId, carId));
  const byCategory = rows
    .map((r) => ({ category: r.category, total: Number(r.total), count: r.count }))
    .sort((a, b) => b.total - a.total);
  const total = byCategory.reduce((a, r) => a + r.total, 0);
  const firstOdo = minOdo ?? car.currentOdometer;
  const distance = car.currentOdometer - firstOdo;
  return {
    total,
    count: byCategory.reduce((a, r) => a + r.count, 0),
    byCategory,
    costPerKm: distance > 500 ? total / distance : null,
  };
}

export async function historyYears(userId: string, carId: string) {
  await getCar(userId, carId);
  const rows = await db
    .selectDistinct({ year: sql<number>`extract(year from ${workItems.performedAt})::int` })
    .from(workItems)
    .where(eq(workItems.carId, carId));
  return rows.map((r) => r.year).sort((a, b) => b - a);
}
