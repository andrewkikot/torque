import "server-only";
import { createTranslator } from "next-intl";
import en from "../../messages/en.json";
import uk from "../../messages/uk.json";
import type { Locale } from "./config";

const all = { en, uk } as const;

export type T = (key: string, values?: Record<string, string | number>) => string;

/** Translator usable outside a request (Telegram bot, cron). Keys are checked at runtime. */
export function translator(locale: Locale): T {
  const t = createTranslator({ locale, messages: all[locale] });
  return (key, values) => (t as unknown as T)(key, values);
}
