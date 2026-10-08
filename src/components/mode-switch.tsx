"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { toast } from "sonner";
import { CarFront, Wrench } from "lucide-react";
import { MODE_COOKIE, type AppMode } from "@/lib/mode";
import { cn } from "@/lib/utils";

function remember(mode: AppMode) {
  document.cookie = `${MODE_COOKIE}=${mode}; path=/; max-age=31536000; samesite=lax`;
}

/** Writes the current side to a cookie so /start can bring the user back here. */
export function ModeMemory({ mode }: { mode: AppMode }) {
  useEffect(() => remember(mode), [mode]);
  return null;
}

type Props = { mode: AppMode; workshop: { name: string; logoUrl: string | null; accentColor: string } };

function useSwitch({ mode, workshop }: Props) {
  const t = useTranslations("mode");
  const router = useRouter();
  return () => {
    const next: AppMode = mode === "garage" ? "workshop" : "garage";
    remember(next);
    router.push(next === "workshop" ? "/w" : "/garage");
    toast(next === "workshop" ? t("toWorkshop", { name: workshop.name }) : t("toGarage"), {
      icon: next === "workshop" ? <Wrench className="size-4" /> : <CarFront className="size-4" />,
      duration: 1600,
    });
  };
}

function WorkshopBadge({ workshop, className }: { workshop: Props["workshop"]; className?: string }) {
  return (
    <span className={cn("grid shrink-0 place-items-center overflow-hidden rounded-full text-white", className)} style={{ background: workshop.accentColor }}>
      {workshop.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={workshop.logoUrl} alt="" className="size-full object-cover" />
      ) : (
        <Wrench className="size-1/2" />
      )}
    </span>
  );
}

/** Last slot of the phone bottom bar: shows the *other* side, so it reads as "go there". */
export function ModeSwitchTab(props: Props & { dark?: boolean }) {
  const t = useTranslations("mode");
  const go = useSwitch(props);
  const toWorkshop = props.mode === "garage";
  return (
    <button onClick={go} className="relative flex flex-col items-center gap-1 py-1" aria-label={toWorkshop ? t("toWorkshop", { name: props.workshop.name }) : t("toGarage")}>
      <span aria-hidden className={cn("absolute -left-px top-2 h-9 w-px", props.dark ? "bg-white/15" : "bg-border")} />
      {toWorkshop ? (
        <WorkshopBadge workshop={props.workshop} className="size-8 ring-2 ring-bg-elevated" />
      ) : (
        <span className={cn("grid size-8 place-items-center rounded-full", props.dark ? "bg-white/15 text-white" : "bg-soft")}>
          <CarFront className="size-4" />
        </span>
      )}
      <span className={cn("max-w-full truncate px-0.5 text-[11px] font-semibold", props.dark ? "text-white/70" : "text-muted")}>
        {toWorkshop ? t("workshopShort") : t("garageShort")}
      </span>
    </button>
  );
}

/** Desktop sidebar: a two-way toggle with the current side highlighted. */
export function ModeSwitchSegmented(props: Props & { dark?: boolean }) {
  const t = useTranslations("mode");
  const go = useSwitch(props);
  const options: { mode: AppMode; label: string; icon: React.ReactNode }[] = [
    { mode: "garage", label: t("garageShort"), icon: <CarFront className="size-4" /> },
    { mode: "workshop", label: props.workshop.name, icon: <WorkshopBadge workshop={props.workshop} className="size-5" /> },
  ];
  return (
    <div className={cn("grid grid-cols-2 gap-1 rounded-2xl p-1", props.dark ? "bg-white/10" : "bg-soft")} role="radiogroup" aria-label={t("label")}>
      {options.map((o) => {
        const on = o.mode === props.mode;
        return (
          <button
            key={o.mode}
            role="radio"
            aria-checked={on}
            title={o.label}
            onClick={on ? undefined : go}
            className={cn(
              "relative flex min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-bold transition",
              props.dark ? (on ? "text-stone-900" : "text-white/60 hover:text-white") : on ? "text-fg" : "text-muted hover:text-fg",
            )}
          >
            {on && (
              <motion.span
                layoutId="mode-pill"
                className={cn("absolute inset-0 rounded-xl shadow-sm", props.dark ? "bg-white" : "bg-card")}
                transition={{ type: "spring", damping: 30, stiffness: 400 }}
              />
            )}
            <span className="relative">{o.icon}</span>
            <span className="relative truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
