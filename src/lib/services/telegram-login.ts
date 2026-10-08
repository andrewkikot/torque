import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db, schema } from "@/db";
import { auth } from "@/lib/auth";
import { magicCapture } from "@/lib/magic-capture";

const { telegramLogins, userSettings, user } = schema;
const TTL_MS = 10 * 60_000;

/** Placeholder email for accounts created from Telegram (Better Auth needs a unique email). */
export const telegramEmail = (telegramUserId: number | string) => `tg-${telegramUserId}@users.torque.local`;
export const isTelegramEmail = (email: string) => email.endsWith("@users.torque.local");

export function describeDevice(userAgent: string | null) {
  if (!userAgent) return null;
  const browser = /Edg\//.test(userAgent) ? "Edge" : /OPR\//.test(userAgent) ? "Opera" : /Firefox\//.test(userAgent) ? "Firefox" : /Chrome\//.test(userAgent) ? "Chrome" : /Safari\//.test(userAgent) ? "Safari" : "Browser";
  const os = /iPhone|iPad/.test(userAgent) ? "iOS" : /Android/.test(userAgent) ? "Android" : /Mac OS X/.test(userAgent) ? "macOS" : /Windows/.test(userAgent) ? "Windows" : /Linux/.test(userAgent) ? "Linux" : "";
  return [browser, os].filter(Boolean).join(" · ");
}

export async function startTelegramLogin(userAgent: string | null) {
  const id = randomBytes(24).toString("base64url"); // 32 chars, fits Telegram's 64-char start param
  await db.insert(telegramLogins).values({ id, device: describeDevice(userAgent), expiresAt: new Date(Date.now() + TTL_MS) });
  return { id, botUrl: `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}?start=login_${id}` };
}

export async function getPendingLogin(id: string) {
  return db.query.telegramLogins.findFirst({
    where: and(eq(telegramLogins.id, id), eq(telegramLogins.status, "pending"), gt(telegramLogins.expiresAt, new Date())),
  });
}

/** Find the account linked to this Telegram chat, or create one. */
export async function userForTelegram(from: { id: number; first_name?: string; username?: string; language_code?: string }, chatId: string) {
  const linked = await db.query.userSettings.findFirst({ where: eq(userSettings.telegramChatId, chatId) });
  if (linked) return { userId: linked.userId, created: false };

  const email = telegramEmail(from.id);
  let existing = await db.query.user.findFirst({ where: eq(user.email, email) });
  if (!existing) {
    [existing] = await db
      .insert(user)
      .values({ id: crypto.randomUUID(), name: from.first_name || from.username || "Driver", email, emailVerified: true })
      .returning();
  }
  const locale = from.language_code && /^(uk|ru|be)/i.test(from.language_code) ? "uk" : "en";
  const values = { userId: existing.id, telegramChatId: chatId, telegramUsername: from.username ? `@${from.username}` : from.first_name ?? null, locale } as const;
  await db.insert(userSettings).values(values).onConflictDoUpdate({ target: userSettings.userId, set: { telegramChatId: chatId, telegramUsername: values.telegramUsername } });
  return { userId: existing.id, created: true };
}

export async function decideLogin(id: string, userId: string | null, approved: boolean) {
  if (approved && !userId) return false;
  const [row] = await db
    .update(telegramLogins)
    .set({ status: approved ? "approved" : "declined", userId })
    .where(and(eq(telegramLogins.id, id), eq(telegramLogins.status, "pending"), gt(telegramLogins.expiresAt, new Date())))
    .returning();
  return !!row;
}

/**
 * Called by the waiting browser. Once approved, mints a one-time magic link (captured, not sent)
 * so the session cookie is set in *this* browser when it follows the URL.
 */
export async function pollLogin(id: string, headers: Headers): Promise<{ status: "pending" | "declined" | "expired" } | { status: "approved"; url: string }> {
  const row = await db.query.telegramLogins.findFirst({ where: eq(telegramLogins.id, id) });
  if (!row || row.expiresAt < new Date() || row.status === "consumed") return { status: "expired" };
  if (row.status === "pending" || row.status === "declined") return { status: row.status };

  const u = await db.query.user.findFirst({ where: eq(user.id, row.userId!) });
  if (!u) return { status: "expired" };
  // Claim the row first so two concurrent polls can't both mint a link.
  const [claimed] = await db
    .update(telegramLogins)
    .set({ status: "consumed" })
    .where(and(eq(telegramLogins.id, id), eq(telegramLogins.status, "approved")))
    .returning();
  if (!claimed) return { status: "expired" };
  const store: { url?: string } = {};
  await magicCapture.run(store, () => auth.api.signInMagicLink({ body: { email: u.email, callbackURL: "/garage" }, headers }));
  return store.url ? { status: "approved", url: store.url } : { status: "expired" };
}
