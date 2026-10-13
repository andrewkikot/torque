import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

export type Channel = "web" | "telegram";

/** One rolling conversation per user per channel, stored as a single JSON row. */
const rowId = (userId: string, channel: Channel) => `${channel}:${userId}`;
const MAX_MESSAGES = 40;

export async function loadConversation<T>(userId: string, channel: Channel): Promise<T[]> {
  const row = await db.query.aiMessages.findFirst({ where: eq(schema.aiMessages.id, rowId(userId, channel)) });
  return (row?.parts as T[] | undefined) ?? [];
}

export async function saveConversation(userId: string, channel: Channel, messages: unknown[]) {
  const trimmed = messages.slice(-MAX_MESSAGES);
  const values = { id: rowId(userId, channel), userId, channel, role: "conversation", parts: trimmed };
  await db
    .insert(schema.aiMessages)
    .values(values)
    .onConflictDoUpdate({ target: schema.aiMessages.id, set: { parts: trimmed, createdAt: new Date() } });
}

export async function clearConversation(userId: string, channel: Channel) {
  await db.delete(schema.aiMessages).where(eq(schema.aiMessages.id, rowId(userId, channel)));
}

/** The car the conversation is currently about (null when none was picked yet). */
export async function getFocusCar(userId: string, channel: Channel) {
  const row = await db.query.aiMessages.findFirst({
    where: eq(schema.aiMessages.id, rowId(userId, channel)),
    columns: { focusCarId: true },
  });
  return row?.focusCarId ?? null;
}

/** Callers must have checked that the car belongs to the user. */
export async function setFocusCar(userId: string, channel: Channel, carId: string) {
  await db
    .insert(schema.aiMessages)
    .values({ id: rowId(userId, channel), userId, channel, role: "conversation", parts: [], focusCarId: carId })
    .onConflictDoUpdate({ target: schema.aiMessages.id, set: { focusCarId: carId } });
}
