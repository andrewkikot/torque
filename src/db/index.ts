import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  // Neon (production / preview): stateless HTTP driver, ideal for serverless + scale-to-zero.
  if (url.includes("neon.tech") || process.env.DB_DRIVER === "neon") {
    return drizzleNeon(neon(url), { schema });
  }
  // Local Postgres for development.
  return drizzlePg(url, { schema }) as unknown as ReturnType<typeof drizzleNeon<typeof schema>>;
}

const globalForDb = globalThis as unknown as { db?: ReturnType<typeof createDb> };

export const db = globalForDb.db ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb.db = db;

export { schema };
