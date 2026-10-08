import "server-only";
import { sql } from "drizzle-orm";
import { db, schema } from "@/db";

/**
 * Fixed-window counter in Postgres (no paid KV needed on the free tier).
 * Returns true when the call is allowed.
 */
export async function hit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const t = schema.usageCounters;
  const [row] = await db
    .insert(t)
    .values({ key, count: 1, windowStart: new Date() })
    .onConflictDoUpdate({
      target: t.key,
      set: {
        count: sql`case when ${t.windowStart} < now() - make_interval(secs => ${windowSeconds}) then 1 else ${t.count} + 1 end`,
        windowStart: sql`case when ${t.windowStart} < now() - make_interval(secs => ${windowSeconds}) then now() else ${t.windowStart} end`,
      },
    })
    .returning({ count: t.count });
  return row.count <= limit;
}
