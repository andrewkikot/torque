import "server-only";
import { AppError } from "@/lib/errors";
import { getCar, getReadings, carLabel } from "@/lib/services/cars";
import { listHistory, historyStats } from "@/lib/services/work";
import { plansWithDue } from "@/lib/services/maintenance";
import { listVisits, visitTotal } from "@/lib/services/visits";
import { adviceForCars } from "@/lib/services/tyres";

/** Keeps the prompt bounded for cars with long histories; older entries stay reachable via getCarHistory. */
const MAX_WORK = 120;
const MAX_VISITS = 10;
const MAX_READINGS = 6;

const day = (d: Date | null | undefined) => d?.toISOString().slice(0, 10) ?? null;
const join = (parts: (string | number | null | undefined | false)[], sep = " · ") => parts.filter((p) => p != null && p !== "" && p !== false).join(sep);

/**
 * Everything saved about one car, as compact text for the system prompt.
 * Returns null when the car no longer exists or isn't the user's.
 */
export async function buildCarDossier(userId: string, carId: string, opts: { units: string }) {
  let car;
  try {
    car = await getCar(userId, carId);
  } catch (e) {
    if (e instanceof AppError) return null;
    throw e;
  }
  const [history, stats, due, visits, readings, tyres] = await Promise.all([
    listHistory(userId, carId),
    historyStats(userId, carId),
    plansWithDue(car),
    listVisits(userId, { carId }),
    getReadings(userId, carId),
    adviceForCars(userId, [carId]),
  ]);
  const u = opts.units;
  const advice = tyres.get(carId);

  const profile = join(
    [
      `id=${car.id}`,
      carLabel(car),
      join([car.year, car.make, car.model], " "),
      car.engine && `engine ${car.engine}`,
      `fuel ${car.fuel}`,
      car.transmission && `transmission ${car.transmission}`,
      car.plate && `plate ${car.plate}`,
      car.vin && `VIN ${car.vin}`,
      car.purchaseDate && `bought ${day(car.purchaseDate)}`,
      car.archived && "ARCHIVED",
    ],
  );

  const plans = due.plans.map((p) =>
    `- ${p.name} [${p.category}] ${p.due.status}` +
    ` · every ${join([p.intervalKm && `${p.intervalKm} ${u}`, p.intervalMonths && `${p.intervalMonths} mo`], " / ") || "?"}` +
    ` · last ${join([day(p.lastDoneAt), p.lastDoneOdometer != null && `${p.lastDoneOdometer} ${u}`], " @ ") || "unknown"}` +
    ` · due ${join([p.due.dueDate && day(p.due.dueDate), p.due.dueOdometer != null && `${p.due.dueOdometer} ${u}`], " / ") || "?"}` +
    (p.due.kmLeft != null ? ` (${p.due.kmLeft} ${u} left)` : "") +
    (p.due.effectiveDaysLeft != null ? ` (~${p.due.effectiveDaysLeft} days)` : ""),
  );

  const work = history.slice(0, MAX_WORK).map((w) =>
    "- " +
    join([
      day(w.performedAt),
      w.odometer != null && `${w.odometer} ${u}`,
      w.name,
      `[${w.category}/${w.type}]`,
      Number(w.quantity) !== 1 && `x${Number(w.quantity)}`,
      `${Number(w.cost)} ${w.currency}`,
      w.partNumber && `part# ${w.partNumber}`,
      w.diy ? "DIY" : w.visit?.shopName && `at ${w.visit.shopName}`,
      w.notes && `notes: ${w.notes.replace(/\s+/g, " ").slice(0, 200)}`,
    ]),
  );

  const visitLines = visits.slice(0, MAX_VISITS).map((v) =>
    "- " +
    join([
      `"${v.title}"`,
      v.status,
      v.workshop?.name ?? v.shopName,
      day(v.completedAt ?? v.plannedAt ?? v.createdAt),
      v.odometer != null && `${v.odometer} ${u}`,
      `total ${visitTotal(v.workItems)} ${v.currency}`,
    ]),
  );

  return [
    `Car: ${profile}`,
    `Odometer: ${car.currentOdometer} ${u} · avg ~${Math.round(due.dailyDistance)} ${u}/day` +
      (readings.length ? ` · recent readings: ${readings.slice(0, MAX_READINGS).map((r) => `${day(r.recordedAt)} ${r.value}`).join(", ")}` : ""),
    `Tyres on the car: ${car.tyreSeason ?? "unknown"}${car.tyreSeasonSetAt ? ` (since ${day(car.tyreSeasonSetAt)})` : ""}` +
      (advice ? ` · open advice: switch to ${advice.target} (${advice.level})` : ""),
    `Maintenance health: ${due.health ?? "unknown"}/100`,
    `Maintenance plan (most urgent first):\n${plans.join("\n") || "(none)"}`,
    `Spending: ${stats.total} total over ${stats.count} entries` +
      (stats.byCategory.length ? ` · ${stats.byCategory.map((c) => `${c.category} ${c.total}`).join(", ")}` : "") +
      (stats.costPerKm != null ? ` · ~${stats.costPerKm.toFixed(2)} per ${u}` : ""),
    `Service book (${history.length} entries, newest first${history.length > MAX_WORK ? `, showing ${MAX_WORK}` : ""}):\n${work.join("\n") || "(empty)"}`,
    `Shop visits (newest first):\n${visitLines.join("\n") || "(none)"}`,
  ].join("\n");
}
