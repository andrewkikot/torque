import { useLocale, useTimeZone, useTranslations } from "next-intl";
import type { DueInfo } from "@/lib/domain/maintenance";
import { formatDate, formatNumber } from "@/lib/format";

/** "in 1 200 km · 2 months" / "overdue by 300 km" */
export function DueText({ due, units }: { due: DueInfo; units: string }) {
  const t = useTranslations("maintenance");
  const tc = useTranslations("common");
  const locale = useLocale();
  const tz = useTimeZone();
  const parts: string[] = [];
  if (due.kmLeft != null) {
    const v = `${formatNumber(Math.abs(due.kmLeft), locale)} ${units}`;
    parts.push(due.kmLeft < 0 ? t("overdueBy", { value: v }) : t("dueIn", { value: v }));
  }
  if (due.daysLeft != null) {
    const v = tc("days", { count: Math.abs(due.daysLeft) });
    if (due.daysLeft < 0) parts.push(t("overdueBy", { value: v }));
    else if (!parts.length || due.daysLeft < 400) parts.push(due.dueDate ? t("dueOn", { date: formatDate(due.dueDate, locale, undefined, tz) }) : t("dueIn", { value: v }));
  }
  return <>{parts.join(" · ") || t("unknown")}</>;
}

export function dueTone(status: DueInfo["status"]) {
  return status === "overdue" ? "danger" : status === "soon" ? "warning" : status === "ok" ? "success" : "neutral";
}
