import "server-only";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { AppError } from "@/lib/errors";
import { adviseTyres, type TyreAdvice, type TyreSeason } from "@/lib/domain/tyres";
import { getCar, listCars } from "./cars";
import { addWork } from "./work";
import { getForecast } from "./weather";
import { getSettings } from "@/lib/session";

const { cars, tyreAdvice, userSettings } = schema;
const DAY = 86_400_000;

const locationInput = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  place: z.string().trim().max(80).optional().nullable(),
});

/** Stored rounded to ~1 km — enough for weather, not a precise home address. */
export async function setLocation(userId: string, raw: unknown) {
  const { lat, lon, place } = locationInput.parse(raw);
  await getSettings(userId);
  await db
    .update(userSettings)
    .set({ weatherLat: Math.round(lat * 100) / 100, weatherLon: Math.round(lon * 100) / 100, weatherPlace: place || null })
    .where(eq(userSettings.userId, userId));
}

export async function clearLocation(userId: string) {
  await db.update(userSettings).set({ weatherLat: null, weatherLon: null, weatherPlace: null }).where(eq(userSettings.userId, userId));
  const ids = (await listCars(userId, { includeArchived: true })).map((c) => c.id);
  if (ids.length) await db.delete(tyreAdvice).where(inArray(tyreAdvice.carId, ids));
}

export async function setTyreSeason(userId: string, carId: string, season: TyreSeason | null) {
  await getCar(userId, carId);
  await db.update(cars).set({ tyreSeason: season, tyreSeasonSetAt: new Date() }).where(eq(cars.id, carId));
  await db.delete(tyreAdvice).where(eq(tyreAdvice.carId, carId));
}

export type OpenAdvice = {
  carId: string;
  target: "winter" | "summer";
  level: "soon" | "now" | "urgent";
  place: string | null;
  reason: TyreAdvice;
};

/**
 * Re-evaluates every car of a user against their local forecast and stores the result.
 * Returns the advice that is currently open (not snoozed).
 */
export async function evaluateUser(userId: string): Promise<OpenAdvice[]> {
  const s = await db.query.userSettings.findFirst({ where: eq(userSettings.userId, userId) });
  if (!s || s.weatherLat == null || s.weatherLon == null) return [];
  const myCars = (await listCars(userId)).filter((c) => c.tyreSeason === "summer" || c.tyreSeason === "winter");
  if (!myCars.length) return [];
  const days = await getForecast(s.weatherLat, s.weatherLon);
  if (!days) return [];
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Kyiv" }).format(new Date());
  const open: OpenAdvice[] = [];
  for (const car of myCars) {
    const advice = adviseTyres(car.tyreSeason, days, today);
    const existing = await db.query.tyreAdvice.findFirst({ where: eq(tyreAdvice.carId, car.id) });
    if (!advice) {
      if (existing) await db.delete(tyreAdvice).where(eq(tyreAdvice.carId, car.id));
      continue;
    }
    // Keep a snooze while the advice points the same way.
    const snoozedUntil = existing && existing.target === advice.target ? existing.snoozedUntil : null;
    const row = { carId: car.id, target: advice.target, level: advice.level, reason: advice as unknown as Record<string, unknown>, place: s.weatherPlace, snoozedUntil };
    await db.insert(tyreAdvice).values(row).onConflictDoUpdate({ target: tyreAdvice.carId, set: row });
    if (!snoozedUntil || snoozedUntil < new Date()) open.push({ carId: car.id, target: advice.target, level: advice.level, place: s.weatherPlace, reason: advice });
  }
  return open;
}

/** Stored advice for display (no network). */
export async function adviceForCars(userId: string, carIds: string[]) {
  if (!carIds.length) return new Map<string, OpenAdvice>();
  const owned = new Set((await listCars(userId, { includeArchived: true })).map((c) => c.id));
  const rows = await db.query.tyreAdvice.findMany({ where: inArray(tyreAdvice.carId, carIds.filter((id) => owned.has(id))) });
  const now = new Date();
  return new Map(
    rows
      .filter((r) => !r.snoozedUntil || r.snoozedUntil < now)
      .map((r) => [r.carId, { carId: r.carId, target: r.target, level: r.level, place: r.place, reason: r.reason as unknown as TyreAdvice }]),
  );
}

export async function snoozeAdvice(userId: string, carId: string, days = 3) {
  await getCar(userId, carId);
  await db.update(tyreAdvice).set({ snoozedUntil: new Date(Date.now() + days * DAY) }).where(eq(tyreAdvice.carId, carId));
}

/** Swapped: update the car, clear advice and log it in the service book. */
export async function markSwapped(userId: string, carId: string, season: "winter" | "summer", name: string) {
  const car = await getCar(userId, carId);
  if (car.tyreSeason === season) throw new AppError("invalid", "Already on these tyres");
  await db.update(cars).set({ tyreSeason: season, tyreSeasonSetAt: new Date() }).where(eq(cars.id, carId));
  await db.delete(tyreAdvice).where(eq(tyreAdvice.carId, carId));
  await addWork(userId, { carId, name, category: "tires", type: "labor", cost: 0, odometer: car.currentOdometer });
}

/** Users who should get tyre reminders from the daily cron. */
export async function reminderUsers() {
  return db.query.userSettings.findMany({
    where: and(isNotNull(userSettings.weatherLat), eq(userSettings.notifyTyres, true)),
  });
}
