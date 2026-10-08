import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db, schema } from "@/db";
import { DEFAULT_SHARE_OPTIONS, type CarShareOptions } from "@/db/schema";
import { getCar } from "./cars";
import { plansWithDue } from "./maintenance";

const { carShares, workItems, cars } = schema;

const optionsInput = z.object({
  odometer: z.boolean(),
  plate: z.boolean(),
  vin: z.boolean(),
  history: z.boolean(),
  costs: z.boolean(),
  receipts: z.boolean(),
  maintenance: z.boolean(),
  workshops: z.boolean(),
});

export async function getShare(userId: string, carId: string) {
  await getCar(userId, carId);
  return (await db.query.carShares.findFirst({ where: eq(carShares.carId, carId) })) ?? null;
}

/** Creates the link on first save; later saves update options / enabled. */
export async function saveShare(userId: string, carId: string, input: { enabled?: boolean; options?: Partial<CarShareOptions> }) {
  await getCar(userId, carId);
  const existing = await db.query.carShares.findFirst({ where: eq(carShares.carId, carId) });
  const options = optionsInput.parse({ ...DEFAULT_SHARE_OPTIONS, ...existing?.options, ...input.options });
  if (!existing) {
    const [row] = await db
      .insert(carShares)
      .values({ carId, token: nanoid(16), options, enabled: input.enabled ?? true })
      .returning();
    return row;
  }
  const [row] = await db
    .update(carShares)
    .set({ options, ...(input.enabled != null ? { enabled: input.enabled } : {}) })
    .where(eq(carShares.carId, carId))
    .returning();
  return row;
}

/** New token: the old link stops working immediately. */
export async function regenerateShare(userId: string, carId: string) {
  await getShare(userId, carId);
  const [row] = await db.update(carShares).set({ token: nanoid(16), views: 0 }).where(eq(carShares.carId, carId)).returning();
  return row;
}

/**
 * Public "car passport". Only fields the owner switched on leave the server —
 * the page never receives hidden data, not even in the HTML payload.
 */
export async function getPublicCar(token: string, opts: { countView?: boolean } = {}) {
  const share = await db.query.carShares.findFirst({ where: and(eq(carShares.token, token), eq(carShares.enabled, true)) });
  if (!share) return null;
  const car = await db.query.cars.findFirst({ where: eq(cars.id, share.carId) });
  if (!car || car.archived) return null;
  if (opts.countView) {
    await db.update(carShares).set({ views: sql`${carShares.views} + 1` }).where(eq(carShares.carId, car.id));
  }
  const o = share.options;
  const items = o.history
    ? await db.query.workItems.findMany({
        where: and(eq(workItems.carId, car.id), eq(workItems.approved, true)),
        orderBy: [desc(workItems.performedAt)],
        with: { visit: { columns: { id: true }, with: { workshop: { columns: { name: true, city: true } } } } },
        limit: 300,
      })
    : [];
  const maintenance = o.maintenance ? (await plansWithDue(car)).plans.filter((p) => p.due.status !== "unknown") : [];
  const settings = await db.query.userSettings.findFirst({ where: eq(schema.userSettings.userId, car.userId), columns: { units: true, currency: true } });

  return {
    options: o,
    units: settings?.units ?? "km",
    currency: settings?.currency ?? "UAH",
    car: {
      make: car.make,
      model: car.model,
      year: car.year,
      nickname: car.nickname,
      engine: car.engine,
      fuel: car.fuel,
      transmission: car.transmission,
      accentColor: car.accentColor,
      photoUrl: car.photoUrl,
      odometer: o.odometer ? car.currentOdometer : null,
      plate: o.plate ? car.plate : null,
      vin: o.vin ? car.vin : null,
    },
    history: items.map((i) => ({
      id: i.id,
      name: i.name,
      category: i.category,
      type: i.type,
      performedAt: i.performedAt,
      odometer: o.odometer ? i.odometer : null,
      cost: o.costs ? Number(i.cost) : null,
      currency: i.currency,
      receiptUrl: o.receipts ? i.receiptUrl : null,
      // Done by a workshop through Torque (vs entered by the owner).
      byWorkshop: !!i.visit?.workshop,
      workshop: o.workshops && i.visit?.workshop ? [i.visit.workshop.name, i.visit.workshop.city].filter(Boolean).join(", ") : null,
      diy: i.diy,
    })),
    maintenance: maintenance.map((p) => ({ name: p.name, category: p.category, status: p.due.status, kmLeft: o.odometer ? p.due.kmLeft : null, dueDate: p.due.dueDate })),
    stats: {
      records: items.length,
      byWorkshop: items.filter((i) => i.visit?.workshop).length,
      total: o.costs ? items.reduce((a, i) => a + Number(i.cost), 0) : null,
      since: items.length ? items[items.length - 1].performedAt : null,
    },
  };
}
export type PublicCar = NonNullable<Awaited<ReturnType<typeof getPublicCar>>>;
