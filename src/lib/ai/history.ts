import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

/** One rolling conversation per user per channel, stored as a single JSON row. */
const rowId = (userId: string, channel: "web" | "telegram") => `${channel}:${userId}`;
const MAX_MESSAGES = 40;

export async function loadConversation<T>(userId: string, channel: "web" | "telegram"): Promise<T[]> {
  const row = await db.query.aiMessages.findFirst({ where: eq(schema.aiMessages.id, rowId(userId, channel)) });
  return (row?.parts as T[] | undefined) ?? [];
}

export async function saveConversation(userId: string, channel: "web" | "telegram", messages: unknown[]) {
  const trimmed = messages.slice(-MAX_MESSAGES);
  const values = { id: rowId(userId, channel), userId, channel, role: "conversation", parts: trimmed };
  await db
    .insert(schema.aiMessages)
    .values(values)
    .onConflictDoUpdate({ target: schema.aiMessages.id, set: { parts: trimmed, createdAt: new Date() } });
}

export async function clearConversation(userId: string, channel: "web" | "telegram") {
  await db.delete(schema.aiMessages).where(eq(schema.aiMessages.id, rowId(userId, channel)));
}
