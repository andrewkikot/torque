import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { adviseTyres, summariseMet, seasonKey, type DaySummary } from "@/lib/domain/tyres";

const day = (date: string, mean: number, min = mean - 3, snow = false): DaySummary => ({ date, mean, min, max: mean + 3, snow });
const week = (means: number[], opts: { min?: (i: number) => number; snow?: number[] } = {}) =>
  means.map((m, i) => day(`2026-11-${String(i + 1).padStart(2, "0")}`, m, opts.min ? opts.min(i) : m - 3, opts.snow?.includes(i) ?? false));

describe("MET Norway parser", () => {
  const json = JSON.parse(fs.readFileSync("tests/fixtures/met-kyiv.json", "utf8"));
  const days = summariseMet(json, "Europe/Kyiv");
  it("summarises the recorded Kyiv forecast into local days", () => {
    expect(days.length).toBeGreaterThanOrEqual(8);
    for (const d of days) {
      expect(d.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(d.min).toBeLessThanOrEqual(d.mean);
      expect(d.mean).toBeLessThanOrEqual(d.max);
    }
    expect(days.map((d) => d.date)).toEqual([...days.map((d) => d.date)].sort());
  });
  it("groups by the local day, not UTC", () => {
    const j = {
      properties: {
        timeseries: [
          { time: "2026-11-01T21:30:00Z", data: { instant: { details: { air_temperature: 1 } } } }, // 23:30 Kyiv, Nov 1
          { time: "2026-11-01T22:30:00Z", data: { instant: { details: { air_temperature: 2 } } } }, // 00:30 Kyiv, Nov 2
          { time: "2026-11-01T23:30:00Z", data: { instant: { details: { air_temperature: 4 } } } },
          { time: "2026-11-01T20:30:00Z", data: { instant: { details: { air_temperature: 0 } }, next_1_hours: { summary: { symbol_code: "lightsnow" } } } },
        ],
      },
    };
    const d = summariseMet(j, "Europe/Kyiv");
    expect(d).toEqual([
      { date: "2026-11-01", mean: 0.5, min: 0, max: 1, snow: true },
      { date: "2026-11-02", mean: 3, min: 2, max: 4, snow: false },
    ]);
  });
});

describe("tyre rule", () => {
  it("no advice for all-season or unknown tyres", () => {
    expect(adviseTyres("all_season", week([0, 0, 0, 0, 0, 0, 0]))).toBeNull();
    expect(adviseTyres(null, week([0, 0, 0, 0, 0, 0, 0]))).toBeNull();
  });
  it("winter now: exactly 5 of 7 days below +7", () => {
    const a = adviseTyres("summer", week([6, 5, 6, 4, 6.9, 9, 10]));
    expect(a).toMatchObject({ target: "winter", level: "now", coldDays: 5 });
  });
  it("winter soon: 3–4 cold days", () => {
    expect(adviseTyres("summer", week([6, 5, 6, 8, 9, 10, 11]))?.level).toBe("soon");
    expect(adviseTyres("summer", week([8, 9, 6, 8, 9, 10, 11]))).toBeNull();
  });
  it("urgent on snow or hard frost within 3 days, even if warm on average", () => {
    expect(adviseTyres("summer", week([9, 9, 9, 9, 9, 9, 9], { snow: [2] }))).toMatchObject({ level: "urgent", trigger: { date: "2026-11-03", snow: true } });
    expect(adviseTyres("summer", week([9, 9, 9, 9, 9, 9, 9], { min: (i) => (i === 1 ? -2 : 3) }))?.level).toBe("urgent");
    // frost on day 5 is not urgent
    expect(adviseTyres("summer", week([9, 9, 9, 9, 9, 9, 9], { min: (i) => (i === 4 ? -5 : 3) }))).toBeNull();
  });
  it("summer: only in spring, when the whole week is warm and frost-free", () => {
    const spring = (means: number[], o = {}) => week(means, o).map((d) => ({ ...d, date: d.date.replace("2026-11", "2027-04") }));
    expect(adviseTyres("winter", spring([8, 9, 10, 11, 12, 13, 14]))).toMatchObject({ target: "summer", level: "now" });
    expect(adviseTyres("winter", spring([8, 9, 10, 11, 12, 13, 6]))).toBeNull();
    expect(adviseTyres("winter", spring([8, 9, 10, 11, 12, 13, 14], { min: (i: number) => (i === 3 ? -1 : 2) }))).toBeNull();
    // A warm week in November is not a reason for summer tyres
    expect(adviseTyres("winter", week([8, 9, 10, 11, 12, 13, 14]))).toBeNull();
  });
  it("no winter advice in summer months", () => {
    const july = week([5, 5, 5, 5, 5, 5, 5]).map((d) => ({ ...d, date: d.date.replace("2026-11", "2027-07") }));
    expect(adviseTyres("summer", july)).toBeNull();
  });
  it("ignores past days and needs at least 5 days of forecast", () => {
    expect(adviseTyres("summer", week([0, 0, 0, 0, 10, 10, 10]), "2026-11-04")).toBeNull();
    expect(adviseTyres("summer", week([0, 0, 0, 0]))).toBeNull();
  });
  it("season keys group autumn and spring correctly", () => {
    expect(seasonKey("winter", new Date("2026-11-10"))).toBe("2026");
    expect(seasonKey("winter", new Date("2027-01-10"))).toBe("2026");
    expect(seasonKey("summer", new Date("2027-04-01"))).toBe("2027");
  });
});
