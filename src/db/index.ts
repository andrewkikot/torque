import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

function createDb() {
  // The Vercel ↔ Neon integration may add a project prefix (e.g. TORQUE_DATABASE_URL).
  const url = process.env.DATABASE_URL ?? process.env.TORQUE_DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  // Neon (production / preview): stateless HTTP driver, ideal for serverless + scale-to-zero.
  if (url.includes("neon.tech") || process.env.DB_DRIVER === "neon") {
    return drizzleNeon(neon(url), { schema });
  }
  // Local Postgres for development.
  return drizzlePg(url, { schema }) as unknown as ReturnType<typeof drizzleNeon<typeof schema>>;
}

type Db = ReturnType<typeof createDb>;
const globalForDb = globalThis as unknown as { db?: Db };

/** Connects lazily, so builds don't need DATABASE_URL just to import this module. */
export const db = new Proxy({} as Db, {
  get(_, prop) {
    globalForDb.db ??= createDb();
    const value = Reflect.get(globalForDb.db, prop);
    return typeof value === "function" ? value.bind(globalForDb.db) : value;
  },
});

export { schema };
