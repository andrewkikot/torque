import "server-only";
import type { T } from "@/i18n/server-translate";
import type { TyreAdvice } from "@/lib/domain/tyres";
import { escapeHtml } from "@/lib/telegram-api";

/** "Thu" in the user's language, from a local YYYY-MM-DD. */
export function weekday(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "uk" ? "uk-UA" : "en-GB", { weekday: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

/** One-paragraph explanation, used by Telegram and the in-app banner. */
export function tyreReason(t: T, a: TyreAdvice, place: string | null, locale: string) {
  const where = place ? `${place}: ` : "";
  if (a.level === "urgent" && a.trigger) {
    return where + (a.trigger.snow ? t("tyres.reasonSnow", { day: weekday(a.trigger.date, locale) }) : t("tyres.reasonFrost", { day: weekday(a.trigger.date, locale), min: a.trigger.min }));
  }
  if (a.target === "winter") return where + t("tyres.reasonCold", { count: a.coldDays });
  return where + t("tyres.reasonWarm");
}

export function tyreTelegramText(t: T, carName: string, a: TyreAdvice, place: string | null, locale: string) {
  const title =
    a.target === "summer" ? t("tyres.titleSummer", { car: escapeHtml(carName) }) : a.level === "urgent" ? t("tyres.titleUrgent", { car: escapeHtml(carName) }) : t("tyres.titleWinter", { car: escapeHtml(carName) });
  return `<b>${title}</b>\n${escapeHtml(tyreReason(t, a, place, locale))}\n\n<i>${t("tyres.attribution")}</i>`;
}
