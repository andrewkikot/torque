"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, Clock, Snowflake, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markSwappedAction, snoozeTyresAction } from "@/app/actions/tyres";
import { THRESHOLD, type TyreAdvice } from "@/lib/domain/tyres";
import { cn } from "@/lib/utils";

const weekday = (date: string, locale: string) =>
  new Intl.DateTimeFormat(locale === "uk" ? "uk-UA" : "en-GB", { weekday: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));

/** Seasonal swap advice with the 7-day outlook that explains it. */
export function TyreBanner({ carId, advice, place }: { carId: string; advice: TyreAdvice; place: string | null }) {
  const t = useTranslations("tyres");
  const locale = useLocale();
  const router = useRouter();
  const [busy, setBusy] = useState<"swap" | "later" | null>(null);
  const winter = advice.target === "winter";
  const urgent = advice.level === "urgent";
  const soon = advice.level === "soon";

  const reason =
    (place ? `${place}: ` : "") +
    (urgent && advice.trigger
      ? advice.trigger.snow
        ? t("reasonSnow", { day: weekday(advice.trigger.date, locale) })
        : t("reasonFrost", { day: weekday(advice.trigger.date, locale), min: advice.trigger.min })
      : winter
        ? t("reasonCold", { count: advice.coldDays })
        : t("reasonWarm"));

  return (
    <div
      className={cn(
        "rounded-3xl border p-4",
        urgent ? "border-sky-500/50 bg-sky-500/10" : winter ? "border-sky-500/30 bg-sky-500/5" : "border-amber-500/30 bg-amber-500/5",
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-2xl text-white", winter ? "bg-sky-500" : "bg-amber-500")}>
          {winter ? <Snowflake className="size-5" /> : <Sun className="size-5" />}
        </span>
        <div className="min-w-0">
          <div className="font-bold">{soon ? t("soonTitle") : winter ? (urgent ? t("bannerUrgent") : t("bannerWinter")) : t("bannerSummer")}</div>
          <p className="text-sm text-muted">{reason}</p>
        </div>
      </div>
      <div className="no-scrollbar -mx-1 mt-3 flex gap-1 overflow-x-auto px-1">
        {advice.days.map((d) => (
          <div
            key={d.date}
            className={cn("flex min-w-11 flex-1 flex-col items-center rounded-xl py-1.5 text-[11px]", d.mean < THRESHOLD ? "bg-sky-500/15" : "bg-amber-500/15")}
            title={`${d.date}: ${d.min}…${d.max} °C`}
          >
            <span className="font-semibold capitalize text-muted">{weekday(d.date, locale)}</span>
            <span>{d.snow ? "🌨" : d.min <= 0 ? "❄️" : d.mean < THRESHOLD ? "🌥" : "☀️"}</span>
            <span className="tabular font-bold">{Math.round(d.max)}°</span>
            <span className="tabular text-muted">{Math.round(d.min)}°</span>
          </div>
        ))}
      </div>
      {!soon && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            loading={busy === "swap"}
            onClick={async () => {
              setBusy("swap");
              const r = await markSwappedAction(carId, advice.target);
              setBusy(null);
              if (!r.ok) return toast.error(r.error);
              toast.success(t(`swappedDone.${advice.target}`));
              router.refresh();
            }}
          >
            <Check /> {t("swapped")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            loading={busy === "later"}
            onClick={async () => {
              setBusy("later");
              await snoozeTyresAction(carId);
              setBusy(null);
              router.refresh();
            }}
          >
            <Clock /> {t("later")}
          </Button>
        </div>
      )}
      <p className="mt-2 text-[10px] text-subtle">{t("attribution")}</p>
    </div>
  );
}
