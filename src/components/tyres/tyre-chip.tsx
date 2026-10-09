"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Sheet } from "@/components/ui/sheet";
import { setTyreSeasonAction } from "@/app/actions/tyres";
import type { TyreSeason } from "@/lib/domain/tyres";
import { cn } from "@/lib/utils";

const ICON: Record<TyreSeason | "unknown", string> = { summer: "☀️", winter: "❄️", all_season: "🌦", unknown: "🛞" };

/** Which tyres are on the car; tapping changes it. Drives seasonal reminders. */
export function TyreChip({ carId, season, hasLocation }: { carId: string; season: TyreSeason | null; hasLocation: boolean }) {
  const t = useTranslations("tyres");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const key = season ?? "unknown";
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-semibold shadow-card active:scale-[0.97]"
      >
        <span>{ICON[key]}</span> {t(`season.${key}`)}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t("whichTyres")}>
        <div className="flex flex-col gap-2">
          {(["summer", "winter", "all_season"] as const).map((s) => (
            <button
              key={s}
              onClick={async () => {
                const r = await setTyreSeasonAction(carId, s);
                if (!r.ok) return toast.error(r.error);
                setOpen(false);
                router.refresh();
              }}
              className={cn(
                "flex items-center gap-3 rounded-2xl border px-4 py-3 text-left font-semibold transition hover:bg-soft",
                season === s ? "border-accent bg-accent-soft" : "border-border",
              )}
            >
              <span className="text-xl">{ICON[s]}</span>
              <span>
                <span className="block">{t(`season.${s}`)}</span>
                <span className="block text-xs font-normal text-muted">{t(`seasonHint.${s}`)}</span>
              </span>
            </button>
          ))}
          {!hasLocation && (
            <a href="/settings#weather" className="mt-2 rounded-2xl bg-soft p-3 text-sm text-muted">
              {t("needLocation")} <span className="font-semibold text-accent">{t("setRegion")} →</span>
            </a>
          )}
        </div>
      </Sheet>
    </>
  );
}
