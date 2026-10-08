import "server-only";
import { eq } from "drizzle-orm";
import { generateText } from "ai";
import { db, schema } from "@/db";
import { AppError } from "@/lib/errors";
import { aiSettingsInput } from "@/lib/validation";
import { keyHint, seal, unseal } from "@/lib/ai/crypto";
import { buildModel } from "@/lib/ai/provider";
import { providerMeta } from "@/lib/ai/providers";

const { aiSettings } = schema;

/** Settings safe to send to the browser: never includes the key itself. */
export async function getPublicAiSettings(userId: string) {
  const s = await db.query.aiSettings.findFirst({ where: eq(aiSettings.userId, userId) });
  if (!s) return null;
  return {
    provider: s.provider,
    model: s.model,
    baseUrl: s.baseUrl,
    keyHint: s.keyHint,
    temperature: s.temperature,
    enabled: s.enabled,
    lastTestedAt: s.lastTestedAt?.toISOString() ?? null,
    lastTestOk: s.lastTestOk,
  };
}
export type PublicAiSettings = NonNullable<Awaited<ReturnType<typeof getPublicAiSettings>>>;

/** Block the custom base URL from pointing at internal networks (SSRF guard). */
function assertSafeBaseUrl(raw: string) {
  const url = new URL(raw);
  const devHttp = process.env.NODE_ENV !== "production" && url.protocol === "http:";
  if (url.protocol !== "https:" && !devHttp) throw new AppError("invalid", "Base URL must use https");
  const h = url.hostname.toLowerCase();
  const privateHost =
    h === "localhost" ||
    h.endsWith(".local") ||
    h.endsWith(".internal") ||
    /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
    h === "[::1]" ||
    h.startsWith("[fc") ||
    h.startsWith("[fd");
  if (privateHost && process.env.NODE_ENV === "production") throw new AppError("invalid", "Private addresses are not allowed");
}

export async function saveAiSettings(userId: string, raw: unknown) {
  const data = aiSettingsInput.parse(raw);
  const meta = providerMeta(data.provider);
  const existing = await db.query.aiSettings.findFirst({ where: eq(aiSettings.userId, userId) });
  const baseUrl = data.provider === "openai_compatible" || data.provider === "openrouter" ? data.baseUrl ?? null : null;
  if (meta.needsBaseUrl && !baseUrl) throw new AppError("invalid", "Base URL is required");
  if (baseUrl) assertSafeBaseUrl(baseUrl);

  let sealed: { encryptedKey: string; iv: string; tag: string; keyHint: string };
  if (data.apiKey) {
    sealed = { ...seal(data.apiKey), keyHint: keyHint(data.apiKey) };
  } else if (existing && existing.provider === data.provider) {
    sealed = { encryptedKey: existing.encryptedKey, iv: existing.iv, tag: existing.tag, keyHint: existing.keyHint };
  } else {
    throw new AppError("invalid", "API key is required");
  }

  const values = {
    userId,
    provider: data.provider,
    model: data.model,
    baseUrl,
    temperature: data.temperature,
    enabled: true,
    lastTestOk: null,
    lastTestedAt: null,
    ...sealed,
  };
  await db.insert(aiSettings).values(values).onConflictDoUpdate({ target: aiSettings.userId, set: values });
}

export async function deleteAiSettings(userId: string) {
  await db.delete(aiSettings).where(eq(aiSettings.userId, userId));
}

export async function setAiEnabled(userId: string, enabled: boolean) {
  await db.update(aiSettings).set({ enabled }).where(eq(aiSettings.userId, userId));
}

/** Server-only: resolves the user's model, or null when the assistant isn't configured. */
export async function getUserModel(userId: string) {
  const s = await db.query.aiSettings.findFirst({ where: eq(aiSettings.userId, userId) });
  if (!s || !s.enabled) return null;
  const apiKey = unseal(s);
  return {
    model: buildModel({ provider: s.provider, model: s.model, apiKey, baseUrl: s.baseUrl }),
    temperature: s.temperature,
    provider: s.provider,
    modelId: s.model,
  };
}

export async function testAiConnection(userId: string): Promise<{ ok: boolean; error?: string; reply?: string }> {
  const m = await getUserModel(userId);
  if (!m) return { ok: false, error: "Assistant is not configured" };
  let result: { ok: boolean; error?: string; reply?: string };
  try {
    const { text } = await generateText({
      model: m.model,
      prompt: "Reply with exactly: OK",
      maxOutputTokens: 200,
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(20_000),
    });
    result = { ok: true, reply: text.trim().slice(0, 60) };
  } catch (e) {
    result = { ok: false, error: providerErrorMessage(e) };
  }
  await db
    .update(aiSettings)
    .set({ lastTestedAt: new Date(), lastTestOk: result.ok })
    .where(eq(aiSettings.userId, userId));
  return result;
}

export function providerErrorMessage(e: unknown): string {
  const err = e as { statusCode?: number; message?: string; responseBody?: string };
  const status = err?.statusCode;
  if (status === 401 || status === 403) return "The provider rejected the API key (unauthorized).";
  if (status === 404) return "Model not found. Check the model name.";
  if (status === 429) return "Rate limit or quota exceeded at the provider.";
  const msg = err?.message ?? String(e);
  // Never echo anything that could contain the key.
  return msg.replace(/(sk-|AIza|gsk_)[A-Za-z0-9_\-]+/g, "[redacted]").slice(0, 240);
}
