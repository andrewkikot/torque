import type { WorkCategory } from "@/db/schema";

const DAY = 86_400_000;

export type Reading = { value: number; recordedAt: Date };

/**
 * Estimate average distance per day from odometer readings.
 * Uses readings from the last ~year, falls back to a conservative default.
 */
export function estimateDailyDistance(readings: Reading[], now = new Date(), fallback = 40): number {
  const recent = readings
    .filter((r) => now.getTime() - r.recordedAt.getTime() < 400 * DAY)
    .sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
  if (recent.length < 2) return fallback;
  const first = recent[0];
  const last = recent[recent.length - 1];
  const days = (last.recordedAt.getTime() - first.recordedAt.getTime()) / DAY;
  const dist = last.value - first.value;
  if (days < 7 || dist <= 0) return fallback;
  return Math.max(1, dist / days);
}

export type PlanInput = {
  intervalKm: number | null;
  intervalMonths: number | null;
  lastDoneAt: Date | null;
  lastDoneOdometer: number | null;
  createdAt: Date;
};

export type DueInfo = {
  dueOdometer: number | null;
  dueDate: Date | null;
  kmLeft: number | null;
  daysLeft: number | null;
  /** Effective days until due considering both distance and time. */
  effectiveDaysLeft: number | null;
  status: "ok" | "soon" | "overdue" | "unknown";
  /** 0..1 how much of the interval has been used. */
  progress: number;
};

function addMonths(d: Date, months: number) {
  const r = new Date(d);
  r.setMonth(r.getMonth() + months);
  return r;
}

export function computeDue(
  plan: PlanInput,
  currentOdometer: number,
  dailyDistance: number,
  now = new Date(),
): DueInfo {
  const baseOdo = plan.lastDoneOdometer;
  const baseDate = plan.lastDoneAt;

  const dueOdometer = plan.intervalKm && baseOdo != null ? baseOdo + plan.intervalKm : null;
  const dueDate = plan.intervalMonths && baseDate ? addMonths(baseDate, plan.intervalMonths) : null;

  const kmLeft = dueOdometer != null ? dueOdometer - currentOdometer : null;
  const daysLeft = dueDate ? Math.round((dueDate.getTime() - now.getTime()) / DAY) : null;
  const daysFromKm = kmLeft != null ? Math.round(kmLeft / Math.max(dailyDistance, 1)) : null;

  const candidates = [daysLeft, daysFromKm].filter((v): v is number => v != null);
  const effectiveDaysLeft = candidates.length ? Math.min(...candidates) : null;

  const progresses: number[] = [];
  if (plan.intervalKm && baseOdo != null) progresses.push((currentOdometer - baseOdo) / plan.intervalKm);
  if (plan.intervalMonths && baseDate)
    progresses.push((now.getTime() - baseDate.getTime()) / (plan.intervalMonths * 30.44 * DAY));
  const progress = progresses.length ? Math.max(0, Math.min(1.2, Math.max(...progresses))) : 0;

  let status: DueInfo["status"] = "unknown";
  if (effectiveDaysLeft != null) {
    const overdue = (kmLeft != null && kmLeft < 0) || (daysLeft != null && daysLeft < 0);
    const soon =
      (kmLeft != null && kmLeft <= Math.max(1000, (plan.intervalKm ?? 0) * 0.1)) ||
      (daysLeft != null && daysLeft <= 30) ||
      effectiveDaysLeft <= 30;
    status = overdue ? "overdue" : soon ? "soon" : "ok";
  }

  return { dueOdometer, dueDate, kmLeft, daysLeft, effectiveDaysLeft, status, progress };
}

/** Garage "health": share of tracked items that are not overdue, weighted down for "soon". */
export function healthScore(statuses: DueInfo["status"][]): number | null {
  const known = statuses.filter((s) => s !== "unknown");
  if (!known.length) return null;
  const score = known.reduce((acc, s) => acc + (s === "ok" ? 1 : s === "soon" ? 0.6 : 0), 0);
  return Math.round((score / known.length) * 100);
}

export type PlanPreset = {
  key: string;
  category: WorkCategory;
  intervalKm: number | null;
  intervalMonths: number | null;
};

const COMMON: PlanPreset[] = [
  { key: "brakeFluid", category: "brakes", intervalKm: null, intervalMonths: 24 },
  { key: "cabinFilter", category: "filters", intervalKm: 15000, intervalMonths: 12 },
  { key: "tireRotation", category: "tires", intervalKm: 10000, intervalMonths: 12 },
  { key: "brakeInspection", category: "brakes", intervalKm: 20000, intervalMonths: 12 },
  { key: "inspection", category: "inspection", intervalKm: null, intervalMonths: 12 },
];

const ICE: PlanPreset[] = [
  { key: "oilChange", category: "oil", intervalKm: 10000, intervalMonths: 12 },
  { key: "airFilter", category: "filters", intervalKm: 30000, intervalMonths: 24 },
  { key: "coolant", category: "cooling", intervalKm: 90000, intervalMonths: 60 },
  { key: "sparkPlugs", category: "engine", intervalKm: 60000, intervalMonths: 48 },
];

const DIESEL: PlanPreset[] = [
  { key: "oilChange", category: "oil", intervalKm: 10000, intervalMonths: 12 },
  { key: "airFilter", category: "filters", intervalKm: 30000, intervalMonths: 24 },
  { key: "fuelFilter", category: "filters", intervalKm: 30000, intervalMonths: 24 },
  { key: "coolant", category: "cooling", intervalKm: 90000, intervalMonths: 60 },
];

const EV: PlanPreset[] = [
  { key: "batteryCheck", category: "battery", intervalKm: 20000, intervalMonths: 12 },
  { key: "acService", category: "ac", intervalKm: null, intervalMonths: 24 },
];

export function presetsForFuel(fuel: string): PlanPreset[] {
  switch (fuel) {
    case "electric":
      return [...EV, ...COMMON];
    case "diesel":
      return [...DIESEL, ...COMMON];
    default:
      return [...ICE, ...COMMON];
  }
}
