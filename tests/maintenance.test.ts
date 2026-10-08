import { describe, expect, it } from "vitest";
import { computeDue, estimateDailyDistance, healthScore, presetsForFuel } from "@/lib/domain/maintenance";

const DAY = 86_400_000;
const now = new Date("2026-06-01T00:00:00Z");

describe("estimateDailyDistance", () => {
  it("falls back with too few readings", () => {
    expect(estimateDailyDistance([], now)).toBe(40);
    expect(estimateDailyDistance([{ value: 1000, recordedAt: now }], now)).toBe(40);
  });
  it("computes km/day from first and last recent reading", () => {
    const r = [
      { value: 10_000, recordedAt: new Date(now.getTime() - 100 * DAY) },
      { value: 15_000, recordedAt: now },
    ];
    expect(estimateDailyDistance(r, now)).toBeCloseTo(50);
  });
  it("ignores readings older than ~400 days", () => {
    const r = [
      { value: 0, recordedAt: new Date(now.getTime() - 900 * DAY) },
      { value: 10_000, recordedAt: new Date(now.getTime() - 30 * DAY) },
      { value: 10_900, recordedAt: now },
    ];
    expect(estimateDailyDistance(r, now)).toBeCloseTo(30);
  });
});

describe("computeDue", () => {
  const base = { createdAt: now };
  it("is ok when far from due", () => {
    const d = computeDue({ ...base, intervalKm: 10_000, intervalMonths: 12, lastDoneOdometer: 50_000, lastDoneAt: new Date(now.getTime() - 30 * DAY) }, 52_000, 30, now);
    expect(d.kmLeft).toBe(8_000);
    expect(d.status).toBe("ok");
    expect(d.dueOdometer).toBe(60_000);
  });
  it("is overdue by distance", () => {
    const d = computeDue({ ...base, intervalKm: 10_000, intervalMonths: null, lastDoneOdometer: 50_000, lastDoneAt: now }, 60_500, 30, now);
    expect(d.kmLeft).toBe(-500);
    expect(d.status).toBe("overdue");
  });
  it("is overdue by time even with low mileage", () => {
    const d = computeDue({ ...base, intervalKm: 10_000, intervalMonths: 12, lastDoneOdometer: 50_000, lastDoneAt: new Date(now.getTime() - 400 * DAY) }, 51_000, 5, now);
    expect(d.status).toBe("overdue");
  });
  it("is soon when predicted mileage rate reaches it within 30 days", () => {
    const d = computeDue({ ...base, intervalKm: 10_000, intervalMonths: null, lastDoneOdometer: 50_000, lastDoneAt: now }, 57_000, 120, now);
    // 3000 km left at 120 km/day ≈ 25 days
    expect(d.effectiveDaysLeft).toBe(25);
    expect(d.status).toBe("soon");
  });
  it("is unknown without baseline", () => {
    const d = computeDue({ ...base, intervalKm: 10_000, intervalMonths: null, lastDoneOdometer: null, lastDoneAt: null }, 57_000, 40, now);
    expect(d.status).toBe("unknown");
  });
});

describe("healthScore", () => {
  it("weights statuses", () => {
    expect(healthScore(["ok", "ok"])).toBe(100);
    expect(healthScore(["ok", "overdue"])).toBe(50);
    expect(healthScore(["soon"])).toBe(60);
    expect(healthScore(["unknown"])).toBeNull();
  });
});

describe("presets", () => {
  it("EVs get no oil change", () => {
    expect(presetsForFuel("electric").some((p) => p.key === "oilChange")).toBe(false);
    expect(presetsForFuel("diesel").some((p) => p.key === "fuelFilter")).toBe(true);
  });
});
