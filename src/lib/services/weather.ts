import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { appUrl } from "@/lib/app-url";
import { summariseMet, type DaySummary, type MetResponse } from "@/lib/domain/tyres";

/** ~11 km grid cell; neighbours share one cached forecast. */
export const cellOf = (lat: number, lon: number) => `${lat.toFixed(1)},${lon.toFixed(1)}`;

type Fetcher = (url: string, init: RequestInit) => Promise<Response>;
let fetcher: Fetcher = (url, init) => fetch(url, init);
/** Tests swap the network for fixtures. */
export function setWeatherFetcher(f: Fetcher | null) {
  fetcher = f ?? ((url, init) => fetch(url, init));
}

const MIN_CACHE_MS = 3 * 3_600_000;

/**
 * Daily forecast summary for a location, from MET Norway Locationforecast 2.0.
 * Follows MET's terms: identifying User-Agent, Expires/If-Modified-Since caching.
 * Returns null (never throws) when the service is unavailable.
 */
export async function getForecast(lat: number, lon: number, timeZone = "Europe/Kyiv"): Promise<DaySummary[] | null> {
  const cell = cellOf(lat, lon);
  const cached = await db.query.weatherCache.findFirst({ where: eq(schema.weatherCache.cell, cell) });
  if (cached && cached.expiresAt > new Date()) return cached.days;

  const [clat, clon] = cell.split(",");
  try {
    const res = await fetcher(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${clat}&lon=${clon}`, {
      headers: {
        "User-Agent": `Torque/1.0 ${appUrl()}`,
        ...(cached?.lastModified ? { "If-Modified-Since": cached.lastModified } : {}),
      },
      signal: AbortSignal.timeout(10_000),
    });
    const expires = new Date(Math.max(Date.parse(res.headers.get("expires") ?? "") || 0, Date.now() + MIN_CACHE_MS));
    if (res.status === 304 && cached) {
      await db.update(schema.weatherCache).set({ expiresAt: expires, fetchedAt: new Date() }).where(eq(schema.weatherCache.cell, cell));
      return cached.days;
    }
    if (!res.ok) throw new Error(`MET ${res.status}`);
    const days = summariseMet((await res.json()) as MetResponse, timeZone);
    const row = { cell, days, fetchedAt: new Date(), expiresAt: expires, lastModified: res.headers.get("last-modified") };
    await db.insert(schema.weatherCache).values(row).onConflictDoUpdate({ target: schema.weatherCache.cell, set: row });
    return days;
  } catch (e) {
    console.error("weather fetch failed", cell, e);
    return cached?.days ?? null;
  }
}
