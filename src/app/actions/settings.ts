"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireUser, getSettings } from "@/lib/session";
import * as ai from "@/lib/services/ai-settings";
import { clearConversation } from "@/lib/ai/history";
import { LOCALE_COOKIE } from "@/i18n/config";
import { run } from "./_result";
import { isTelegramEmail } from "@/lib/services/telegram-login";
import { AppError } from "@/lib/errors";
import { TERMS_VERSION } from "@/lib/terms";

const prefsInput = z
  .object({
    locale: z.enum(["en", "uk"]),
    units: z.enum(["km", "mi"]),
    currency: z.string().regex(/^[A-Z]{3}$/),
    notifyVisitUpdates: z.boolean(),
    notifyMaintenance: z.boolean(),
    notifyMileageNudge: z.boolean(),
    notifyTyres: z.boolean(),
  })
  .partial();

export async function updatePrefsAction(input: unknown) {
  const user = await requireUser();
  return run(async () => {
    const data = prefsInput.parse(input);
    await getSettings(user.id);
    await db.update(schema.userSettings).set(data).where(eq(schema.userSettings.userId, user.id));
    if (data.locale) {
      (await cookies()).set(LOCALE_COOKIE, data.locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    }
    revalidatePath("/", "layout");
  });
}

/** Records acceptance of the current Terms version (and when). */
export async function acceptTermsAction(version: string) {
  const user = await requireUser();
  return run(async () => {
    if (version !== TERMS_VERSION) throw new AppError("invalid", "The terms have changed. Reload the page.");
    await getSettings(user.id);
    await db
      .update(schema.userSettings)
      .set({ termsVersion: TERMS_VERSION, termsAcceptedAt: new Date() })
      .where(eq(schema.userSettings.userId, user.id));
    revalidatePath("/", "layout");
  });
}

export async function updateNameAction(name: string) {
  const user = await requireUser();
  return run(async () => {
    const n = z.string().trim().min(1).max(60).parse(name);
    await db.update(schema.user).set({ name: n }).where(eq(schema.user.id, user.id));
    revalidatePath("/", "layout");
  });
}

/** Locale switch that also works before sign-in (landing page). */
export async function setLocaleCookieAction(locale: "en" | "uk") {
  (await cookies()).set(LOCALE_COOKIE, locale === "uk" ? "uk" : "en", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/", "layout");
}

export async function createTelegramLinkAction() {
  const user = await requireUser();
  return run(async () => {
    const bot = process.env.TELEGRAM_BOT_USERNAME;
    if (!process.env.TELEGRAM_BOT_TOKEN || !bot) throw new Error("Telegram bot not configured");
    await getSettings(user.id);
    const code = randomBytes(12).toString("base64url");
    await db
      .update(schema.userSettings)
      .set({ telegramLinkCode: code, telegramLinkExpiresAt: new Date(Date.now() + 15 * 60_000) })
      .where(eq(schema.userSettings.userId, user.id));
    return { url: `https://t.me/${bot}?start=${code}` };
  });
}

export async function telegramStatusAction() {
  const user = await requireUser();
  const s = await getSettings(user.id);
  return { connected: !!s.telegramChatId, username: s.telegramUsername };
}

export async function disconnectTelegramAction() {
  const user = await requireUser();
  return run(async () => {
    // Accounts created via Telegram have no real email: unlinking would lock the user out.
    if (isTelegramEmail(user.email)) throw new AppError("forbidden", "This account signs in with Telegram, so it can't be disconnected.");
    await db
      .update(schema.userSettings)
      .set({ telegramChatId: null, telegramUsername: null })
      .where(eq(schema.userSettings.userId, user.id));
    revalidatePath("/settings");
  });
}

export async function saveAiSettingsAction(input: unknown) {
  const user = await requireUser();
  return run(async () => {
    await ai.saveAiSettings(user.id, input);
    const test = await ai.testAiConnection(user.id);
    revalidatePath("/settings");
    revalidatePath("/assistant");
    return test;
  });
}

export async function testAiAction() {
  const user = await requireUser();
  return run(async () => {
    const r = await ai.testAiConnection(user.id);
    revalidatePath("/settings");
    return r;
  });
}

export async function deleteAiSettingsAction() {
  const user = await requireUser();
  return run(async () => {
    await ai.deleteAiSettings(user.id);
    revalidatePath("/settings");
    revalidatePath("/assistant");
  });
}

export async function setAiEnabledAction(enabled: boolean) {
  const user = await requireUser();
  return run(async () => {
    await ai.setAiEnabled(user.id, enabled);
    revalidatePath("/settings");
    revalidatePath("/assistant");
  });
}

export async function clearChatAction() {
  const user = await requireUser();
  return run(async () => {
    await clearConversation(user.id, "web");
  });
}
