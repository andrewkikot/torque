import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { notFound, AppError } from "@/lib/errors";
import { carInput, type CarInput } from "@/lib/validation";
import { presetsForFuel } from "@/lib/domain/maintenance";
import en from "../../../messages/en.json";

const { cars, odometerReadings } = schema;

export async function listCars(userId: string, opts: { includeArchived?: boolean } = {}) {
  return db.query.cars.findMany({
    where: opts.includeArchived
      ? eq(cars.userId, userId)
      : and(eq(cars.userId, userId), eq(cars.archived, false)),
    orderBy: [asc(cars.archived), desc(cars.updatedAt)],
  });
}

export async function getCar(userId: string, carId: string) {
  const car = await db.query.cars.findFirst({
    where: and(eq(cars.id, carId), eq(cars.userId, userId)),
  });
  if (!car) notFound("Car");
  return car;
}

export async function createCar(
  userId: string,
  raw: unknown,
  opts: { presetNames?: Record<string, string>; withPresets?: boolean } = {},
) {
  const data: CarInput = carInput.parse(raw);
  const [car] = await db.insert(cars).values({ ...data, userId }).returning();
  if (data.currentOdometer > 0) {
    await db.insert(odometerReadings).values({ carId: car.id, value: data.currentOdometer, source: "web" });
  }
  if (opts.withPresets !== false) {
    const presets = presetsForFuel(car.fuel);
    await db.insert(schema.maintenancePlans).values(
      presets.map((p) => ({
        carId: car.id,
        name: opts.presetNames?.[p.key] ?? (en.presets as Record<string, string>)[p.key] ?? p.key,
        category: p.category,
        intervalKm: p.intervalKm,
        intervalMonths: p.intervalMonths,
        // Unknown history: start counting from today/current mileage.
        lastDoneAt: new Date(),
        lastDoneOdometer: car.currentOdometer,
      })),
    );
  }
  return car;
}

export async function updateCar(userId: string, carId: string, raw: unknown) {
  const existing = await getCar(userId, carId);
  const data = carInput.partial().parse(raw);
  const [car] = await db
    .update(cars)
    .set(data)
    .where(and(eq(cars.id, carId), eq(cars.userId, userId)))
    .returning();
  if (data.currentOdometer != null && data.currentOdometer !== existing.currentOdometer) {
    await db.insert(odometerReadings).values({ carId, value: data.currentOdometer, source: "web" });
  }
  return car;
}

export async function setArchived(userId: string, carId: string, archived: boolean) {
  await getCar(userId, carId);
  await db.update(cars).set({ archived }).where(and(eq(cars.id, carId), eq(cars.userId, userId)));
}

export async function deleteCar(userId: string, carId: string) {
  await getCar(userId, carId);
  await db.delete(cars).where(and(eq(cars.id, carId), eq(cars.userId, userId)));
}

export type OdometerSource = "web" | "telegram" | "service" | "ai";

/**
 * Record a mileage reading. Readings lower than the current value are rejected unless forced
 * (typo protection: "84500" vs "8450").
 */
export async function logOdometer(
  userId: string,
  carId: string,
  value: number,
  source: OdometerSource,
  opts: { allowDecrease?: boolean } = {},
) {
  const car = await getCar(userId, carId);
  if (!Number.isFinite(value) || value < 0 || value > 5_000_000) throw new AppError("invalid", "Invalid mileage");
  if (value < car.currentOdometer && !opts.allowDecrease) {
    throw new AppError("invalid", `Mileage ${value} is lower than current ${car.currentOdometer}`);
  }
  await db.insert(odometerReadings).values({ carId, value, source });
  if (value !== car.currentOdometer) {
    await db.update(cars).set({ currentOdometer: value }).where(eq(cars.id, carId));
  }
  return { previous: car.currentOdometer, current: value, delta: value - car.currentOdometer, car };
}

/** Internal: bump odometer if a service/work record shows a higher value. */
export async function bumpOdometer(carId: string, value: number | null | undefined, source: OdometerSource) {
  if (value == null) return;
  const car = await db.query.cars.findFirst({ where: eq(cars.id, carId) });
  if (!car || value <= car.currentOdometer) return;
  await db.insert(odometerReadings).values({ carId, value, source });
  await db.update(cars).set({ currentOdometer: value }).where(eq(cars.id, carId));
}

export async function getReadings(userId: string, carId: string) {
  await getCar(userId, carId);
  return db.query.odometerReadings.findMany({
    where: eq(odometerReadings.carId, carId),
    orderBy: [desc(odometerReadings.recordedAt)],
    limit: 200,
  });
}

export function carLabel(car: { nickname: string | null; make: string; model: string; year?: number | null }) {
  return car.nickname || `${car.make} ${car.model}`;
}

/* ───────────── Check-in codes ("Show to mechanic") ───────────── */

const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // no 0/O, 1/I/L

function newCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

/** "tq-7k4m q2" → "7K4MQ2" */
export function normalizeCheckinCode(input: string) {
  return input.toUpperCase().replace(/^TQ[-\s]?/, "").replace(/[^0-9A-Z]/g, "");
}

export const formatCheckinCode = (code: string) => `TQ-${code}`;

export async function rotateCheckinCode(carId: string) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode();
    try {
      await db.update(cars).set({ checkinCode: code }).where(eq(cars.id, carId));
      return code;
    } catch {
      // unique collision, try again
    }
  }
  throw new AppError("invalid", "Could not generate a code");
}

/** The owner's current code, created on first use. */
export async function getCheckinCode(userId: string, carId: string) {
  const car = await getCar(userId, carId);
  return car.checkinCode ?? rotateCheckinCode(car.id);
}

export async function newCheckinCode(userId: string, carId: string) {
  await getCar(userId, carId);
  return rotateCheckinCode(carId);
}

export async function findCarByCheckinCode(code: string) {
  const normalized = normalizeCheckinCode(code);
  if (normalized.length !== 6) return null;
  return (await db.query.cars.findFirst({ where: and(eq(cars.checkinCode, normalized), eq(cars.archived, false)) })) ?? null;
}
