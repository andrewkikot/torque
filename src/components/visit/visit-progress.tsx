"use client";

import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { Check } from "lucide-react";
import { STATUS_EMOJI, type VisitStatusValue } from "@/lib/domain/visit-status";
import { cn } from "@/lib/utils";

const STEPS = ["planned", "dropped_off", "diagnosing", "in_progress", "ready", "completed"] as const;

/** Detours sit "inside" a main step on the stepper. */
const POSITION: Record<VisitStatusValue, number> = {
  planned: 0,
  dropped_off: 1,
  diagnosing: 2,
  awaiting_approval: 2,
  waiting_parts: 3,
  in_progress: 3,
  quality_check: 3,
  ready: 4,
  completed: 5,
  cancelled: -1,
};

export function VisitProgress({ status, compact }: { status: VisitStatusValue; compact?: boolean }) {
  const t = useTranslations("status");
  const pos = POSITION[status];
  const cancelled = status === "cancelled";

  if (compact) {
    return (
      <div>
        <div className="flex gap-1">
          {STEPS.map((s, i) => (
            <div key={s} className="h-1.5 flex-1 overflow-hidden rounded-full bg-soft">
              <motion.div className="h-full bg-accent" initial={{ width: 0 }} animate={{ width: i <= pos ? "100%" : "0%" }} transition={{ duration: 0.5, delay: i * 0.06 }} />
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-sm font-semibold">
          <span>{STATUS_EMOJI[status]}</span>
          {t(status)}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(cancelled && "opacity-50")}>
      <ol className="relative flex justify-between">
        <div className="absolute left-4 right-4 top-4 h-1 rounded-full bg-soft" />
        <motion.div
          className="absolute left-4 top-4 h-1 rounded-full bg-accent"
          initial={{ width: 0 }}
          animate={{ width: `calc((100% - 2rem) * ${Math.max(0, pos) / (STEPS.length - 1)})` }}
          transition={{ type: "spring", damping: 26, stiffness: 90 }}
        />
        {STEPS.map((s, i) => {
          const done = i < pos;
          const current = i === pos;
          return (
            <li key={s} className="relative z-10 flex w-8 flex-col items-center">
              <motion.span
                initial={false}
                animate={{ scale: current ? 1.15 : 1 }}
                className={cn(
                  "grid size-8 place-items-center rounded-full border-2 text-sm transition-colors",
                  done && "border-accent bg-accent text-accent-fg",
                  current && "border-accent bg-card shadow-[0_0_0_6px_var(--accent-soft)]",
                  !done && !current && "border-border bg-card text-subtle",
                )}
              >
                {done ? <Check className="size-4" /> : current ? STATUS_EMOJI[status] : i + 1}
              </motion.span>
              <span className={cn("mt-2 hidden w-20 text-center text-[11px] font-semibold leading-tight sm:block", current ? "text-fg" : "text-muted")}>{t(s)}</span>
            </li>
          );
        })}
      </ol>
      <div className="mt-5 flex items-center gap-3 sm:hidden">
        <span className="text-2xl">{STATUS_EMOJI[status]}</span>
        <span className="font-display text-lg font-semibold">{t(status)}</span>
      </div>
      {(status === "awaiting_approval" || status === "waiting_parts" || status === "quality_check" || cancelled) && (
        <div className="mt-4 hidden items-center gap-2 rounded-2xl bg-accent-soft px-3 py-2 text-sm font-semibold sm:inline-flex">
          {STATUS_EMOJI[status]} {t(status)}
        </div>
      )}
    </div>
  );
}
