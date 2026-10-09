/**
 * Seasonal tyre advice from a forecast — the "+7 °C rule" with frost/snow overrides.
 * Pure functions: no network, no DB.
 */

export type DaySummary = {
  /** Local date, YYYY-MM-DD */
  date: string;
  mean: number;
  min: number;
  max: number;
  /** Snow or sleet expected that day */
  snow: boolean;
};

export type TyreSeason = "summer" | "winter" | "all_season";
export type AdviceLevel = "soon" | "now" | "urgent";
export type TyreAdvice = {
  target: "winter" | "summer";
  level: AdviceLevel;
  coldDays: number;
  warmDays: number;
  /** First upcoming frost/snow day that triggered "urgent", if any */
  trigger: { date: string; min: number; snow: boolean } | null;
  days: DaySummary[];
};

export const THRESHOLD = 7;
const URGENT_FROST = -2;

/* ───────── MET Norway Locationforecast 2.0 (compact) → daily summaries ───────── */

type MetPoint = {
  time: string;
  data: {
    instant: { details: { air_temperature?: number } };
    next_1_hours?: { summary?: { symbol_code?: string } };
    next_6_hours?: { summary?: { symbol_code?: string } };
    next_12_hours?: { summary?: { symbol_code?: string } };
  };
};
export type MetResponse = { properties: { timeseries: MetPoint[] } };

const SNOWY = /snow|sleet/;

/** Group the forecast by local day; days with fewer than 2 samples are dropped. */
export function summariseMet(json: MetResponse, timeZone = "Europe/Kyiv"): DaySummary[] {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  const byDay = new Map<string, { temps: number[]; snow: boolean }>();
  for (const p of json.properties.timeseries) {
    const t = p.data.instant.details.air_temperature;
    const date = fmt.format(new Date(p.time));
    const d = byDay.get(date) ?? { temps: [], snow: false };
    if (typeof t === "number") d.temps.push(t);
    const symbol = p.data.next_1_hours?.summary?.symbol_code ?? p.data.next_6_hours?.summary?.symbol_code ?? p.data.next_12_hours?.summary?.symbol_code ?? "";
    if (SNOWY.test(symbol)) d.snow = true;
    byDay.set(date, d);
  }
  return [...byDay.entries()]
    .filter(([, d]) => d.temps.length >= 2)
    .map(([date, d]) => ({
      date,
      mean: round1(d.temps.reduce((a, b) => a + b, 0) / d.temps.length),
      min: round1(Math.min(...d.temps)),
      max: round1(Math.max(...d.temps)),
      snow: d.snow,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/* ───────── The rule ───────── */

/**
 * Months (1–12) in which each switch makes sense. A warm October week shouldn't
 * suggest summer tyres, and a cold snap in July shouldn't suggest winter ones.
 */
const WINTER_SWITCH_MONTHS = [9, 10, 11, 12, 1, 2, 3, 4, 5];
const SUMMER_SWITCH_MONTHS = [3, 4, 5, 6];

export function adviseTyres(season: TyreSeason | null | undefined, days: DaySummary[], today?: string): TyreAdvice | null {
  if (!season || season === "all_season") return null;
  const upcoming = (today ? days.filter((d) => d.date >= today) : days).slice(0, 7);
  if (!upcoming.length) return null;
  const month = Number((today ?? upcoming[0].date).slice(5, 7));
  if (season === "summer" && !WINTER_SWITCH_MONTHS.includes(month)) return null;
  if (season === "winter" && !SUMMER_SWITCH_MONTHS.includes(month)) return null;
  if (upcoming.length < 5) return null; // not enough forecast to judge
  const coldDays = upcoming.filter((d) => d.mean < THRESHOLD).length;
  const warmDays = upcoming.length - coldDays;

  if (season === "summer") {
    const trigger = upcoming.slice(0, 3).find((d) => d.snow || d.min <= URGENT_FROST);
    if (trigger) return { target: "winter", level: "urgent", coldDays, warmDays, trigger: { date: trigger.date, min: trigger.min, snow: trigger.snow }, days: upcoming };
    if (coldDays >= 5) return { target: "winter", level: "now", coldDays, warmDays, trigger: null, days: upcoming };
    if (coldDays >= 3) return { target: "winter", level: "soon", coldDays, warmDays, trigger: null, days: upcoming };
    return null;
  }

  // On winter tyres: only advise summer once the whole week is reliably warm.
  const allWarm = upcoming.length >= 7 && upcoming.every((d) => d.mean >= THRESHOLD && d.min >= 0 && !d.snow);
  return allWarm ? { target: "summer", level: "now", coldDays, warmDays, trigger: null, days: upcoming } : null;
}

/** Season key for de-duplication: autumn swaps belong to that year, spring swaps to the year they happen. */
export function seasonKey(target: "winter" | "summer", now = new Date()) {
  const y = now.getFullYear();
  return target === "winter" ? `${now.getMonth() < 6 ? y - 1 : y}` : `${y}`;
}

/** Ukrainian regional centres for the location picker (no geocoding service needed). */
export const UA_REGIONS: { id: string; en: string; uk: string; lat: number; lon: number }[] = [
  { id: "kyiv", en: "Kyiv", uk: "Київ", lat: 50.45, lon: 30.52 },
  { id: "vinnytsia", en: "Vinnytsia", uk: "Вінниця", lat: 49.23, lon: 28.47 },
  { id: "lutsk", en: "Lutsk", uk: "Луцьк", lat: 50.75, lon: 25.33 },
  { id: "dnipro", en: "Dnipro", uk: "Дніпро", lat: 48.46, lon: 35.05 },
  { id: "donetsk", en: "Donetsk", uk: "Донецьк", lat: 48.0, lon: 37.8 },
  { id: "zhytomyr", en: "Zhytomyr", uk: "Житомир", lat: 50.25, lon: 28.66 },
  { id: "uzhhorod", en: "Uzhhorod", uk: "Ужгород", lat: 48.62, lon: 22.29 },
  { id: "zaporizhzhia", en: "Zaporizhzhia", uk: "Запоріжжя", lat: 47.84, lon: 35.14 },
  { id: "ivano-frankivsk", en: "Ivano-Frankivsk", uk: "Івано-Франківськ", lat: 48.92, lon: 24.71 },
  { id: "kropyvnytskyi", en: "Kropyvnytskyi", uk: "Кропивницький", lat: 48.51, lon: 32.26 },
  { id: "luhansk", en: "Luhansk", uk: "Луганськ", lat: 48.57, lon: 39.31 },
  { id: "lviv", en: "Lviv", uk: "Львів", lat: 49.84, lon: 24.03 },
  { id: "mykolaiv", en: "Mykolaiv", uk: "Миколаїв", lat: 46.98, lon: 32.0 },
  { id: "odesa", en: "Odesa", uk: "Одеса", lat: 46.48, lon: 30.72 },
  { id: "poltava", en: "Poltava", uk: "Полтава", lat: 49.59, lon: 34.55 },
  { id: "rivne", en: "Rivne", uk: "Рівне", lat: 50.62, lon: 26.25 },
  { id: "sumy", en: "Sumy", uk: "Суми", lat: 50.91, lon: 34.8 },
  { id: "ternopil", en: "Ternopil", uk: "Тернопіль", lat: 49.55, lon: 25.59 },
  { id: "kharkiv", en: "Kharkiv", uk: "Харків", lat: 49.99, lon: 36.23 },
  { id: "kherson", en: "Kherson", uk: "Херсон", lat: 46.64, lon: 32.62 },
  { id: "khmelnytskyi", en: "Khmelnytskyi", uk: "Хмельницький", lat: 49.42, lon: 27.0 },
  { id: "cherkasy", en: "Cherkasy", uk: "Черкаси", lat: 49.44, lon: 32.06 },
  { id: "chernivtsi", en: "Chernivtsi", uk: "Чернівці", lat: 48.29, lon: 25.94 },
  { id: "chernihiv", en: "Chernihiv", uk: "Чернігів", lat: 51.5, lon: 31.29 },
  { id: "simferopol", en: "Simferopol", uk: "Сімферополь", lat: 44.95, lon: 34.1 },
];
