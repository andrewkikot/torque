import "server-only";
import { tool } from "ai";
import { z } from "zod";
import { workCategoryEnum, workTypeEnum } from "@/db/schema";
import { listCars, getCar, logOdometer, carLabel } from "@/lib/services/cars";
import { listHistory } from "@/lib/services/work";
import { addWork } from "@/lib/services/work";
import { getUpcoming, addPlan } from "@/lib/services/maintenance";
import { listVisits, visitTotal, vehicleLabel } from "@/lib/services/visits";
import { AppError } from "@/lib/errors";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { evaluateUser } from "@/lib/services/tyres";
import { getForecast } from "@/lib/services/weather";

const carId = z.string().describe("Car id from listCars or the garage context");

async function safe<T>(fn: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof AppError) return { error: e.message };
    if (e instanceof z.ZodError) return { error: e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
    throw e;
  }
}

/** All tools are bound to the signed-in user; the model can never reach other users' data. */
export function buildTools(userId: string, source: "ai" | "telegram" = "ai") {
  return {
    listCars: tool({
      description: "List the user's cars with id, name, odometer and fuel type.",
      inputSchema: z.object({}),
      execute: async () =>
        (await listCars(userId)).map((c) => ({
          id: c.id,
          name: carLabel(c),
          make: c.make,
          model: c.model,
          year: c.year,
          fuel: c.fuel,
          engine: c.engine,
          odometer: c.currentOdometer,
        })),
    }),

    getCarHistory: tool({
      description: "Get recent service/work history for a car (newest first).",
      inputSchema: z.object({ carId, limit: z.number().int().min(1).max(50).default(20) }),
      execute: ({ carId, limit }) =>
        safe(async () =>
          (await listHistory(userId, carId)).slice(0, limit).map((w) => ({
            date: w.performedAt.toISOString().slice(0, 10),
            name: w.name,
            category: w.category,
            type: w.type,
            cost: Number(w.cost),
            currency: w.currency,
            odometer: w.odometer,
            diy: w.diy,
            shop: w.visit?.shopName ?? null,
          })),
        ),
    }),

    getUpcomingMaintenance: tool({
      description: "Get maintenance items with predicted due dates/mileage for a car, most urgent first.",
      inputSchema: z.object({ carId }),
      execute: ({ carId }) =>
        safe(async () => {
          const { car, plans, dailyDistance, health } = await getUpcoming(userId, carId);
          return {
            car: carLabel(car),
            odometer: car.currentOdometer,
            avgPerDay: Math.round(dailyDistance),
            health,
            items: plans.map((p) => ({
              name: p.name,
              category: p.category,
              status: p.due.status,
              kmLeft: p.due.kmLeft,
              daysLeft: p.due.effectiveDaysLeft,
              dueOdometer: p.due.dueOdometer,
              dueDate: p.due.dueDate?.toISOString().slice(0, 10) ?? null,
            })),
          };
        }),
    }),

    getServiceVisits: tool({
      description: "List service visits (shop jobs) and their status.",
      inputSchema: z.object({ activeOnly: z.boolean().default(false), carId: carId.optional() }),
      execute: ({ activeOnly, carId }) =>
        safe(async () =>
          (await listVisits(userId, { activeOnly, carId })).slice(0, 15).map((v) => ({
            id: v.id,
            car: vehicleLabel(v),
            title: v.title,
            shop: v.workshop?.name ?? v.shopName,
            status: v.status,
            eta: v.eta?.toISOString() ?? null,
            total: visitTotal(v.workItems),
            currency: v.currency,
          })),
        ),
    }),

    getTyreAdvice: tool({
      description: "Seasonal tyre advice for the user's cars from the local weather forecast (+7 °C rule, frost/snow). Use for questions like 'do I need winter tyres yet?'.",
      inputSchema: z.object({}),
      execute: () =>
        safe(async () => {
          const s = await db.query.userSettings.findFirst({ where: eq(schema.userSettings.userId, userId) });
          if (s?.weatherLat == null) return { error: "No region set. Ask the user to set it in Settings → Weather & tyres." };
          const open = new Map((await evaluateUser(userId)).map((a) => [a.carId, a]));
          const cars = await listCars(userId);
          const forecast = s.weatherLat != null && s.weatherLon != null ? await getForecast(s.weatherLat, s.weatherLon) : null;
          return {
            place: s.weatherPlace,
            forecast: forecast?.slice(0, 7),
            cars: cars.map((c) => ({ name: carLabel(c), tyres: c.tyreSeason ?? "unknown", advice: open.get(c.id) ? { switchTo: open.get(c.id)!.target, level: open.get(c.id)!.level } : null })),
            source: "MET Norway",
          };
        }),
    }),

    logOdometer: tool({
      description: "Record the current odometer (mileage) reading for a car. Requires user approval.",
      inputSchema: z.object({ carId, value: z.number().int().min(0).describe("Odometer reading in the user's units") }),
      execute: ({ carId, value }) =>
        safe(async () => {
          const r = await logOdometer(userId, carId, value, source === "telegram" ? "telegram" : "ai");
          return { ok: true, car: carLabel(r.car), previous: r.previous, current: r.current };
        }),
    }),

    addWorkItem: tool({
      description:
        "Add a completed work/repair/part entry to the car's service book (e.g. 'changed oil at 84000 km, paid 1800'). Requires user approval.",
      inputSchema: z.object({
        carId,
        name: z.string().describe("Short name, e.g. 'Engine oil & filter change'"),
        category: z.enum(workCategoryEnum.enumValues),
        type: z.enum(workTypeEnum.enumValues).default("labor"),
        cost: z.number().min(0).default(0),
        odometer: z.number().int().min(0).optional().describe("Mileage when the work was done"),
        date: z.string().optional().describe("ISO date (YYYY-MM-DD); defaults to today"),
        partNumber: z.string().optional(),
        notes: z.string().optional(),
        diy: z.boolean().default(false),
      }),
      execute: ({ date, ...input }) =>
        safe(async () => {
          const item = await addWork(userId, { ...input, performedAt: date ? new Date(date) : undefined }, { source: source === "telegram" ? "telegram" : "ai" });
          return { ok: true, id: item.id, name: item.name };
        }),
    }),

    addMaintenancePlan: tool({
      description: "Add a recurring maintenance reminder (interval by distance and/or months). Requires user approval.",
      inputSchema: z.object({
        carId,
        name: z.string(),
        category: z.enum(workCategoryEnum.enumValues),
        intervalKm: z.number().int().min(100).optional(),
        intervalMonths: z.number().int().min(1).optional(),
      }),
      execute: (input) =>
        safe(async () => {
          await getCar(userId, input.carId);
          const p = await addPlan(userId, input);
          return { ok: true, id: p.id };
        }),
    }),
  };
}

export type AgentTools = ReturnType<typeof buildTools>;

export const WRITE_TOOLS = ["logOdometer", "addWorkItem", "addMaintenancePlan"] as const;

export const approvalConfig = Object.fromEntries(WRITE_TOOLS.map((t) => [t, "user-approval" as const]));
