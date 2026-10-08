"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import { STATUS_EMOJI } from "@/lib/domain/visit-status";
import { cn } from "@/lib/utils";

const STEPS = ["dropped_off", "diagnosing", "in_progress", "quality_check", "ready"] as const;

/** Looping mock of the live service tracker for the landing page. */
export function HeroDemo() {
  const t = useTranslations("status");
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % (STEPS.length + 1)), 1800);
    return () => clearInterval(id);
  }, []);
  const step = Math.min(i, STEPS.length - 1);

  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="absolute -inset-6 rounded-[3rem] bg-gradient-to-br from-accent/30 to-transparent blur-2xl" />
      <div className="relative rounded-[2.5rem] border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-accent text-2xl">🚙</div>
          <div>
            <div className="font-display font-semibold">Golf · “Blue Bullet”</div>
            <div className="text-sm text-muted">AutoMaster · ТО 90 000</div>
          </div>
        </div>

        <div className="mt-6 flex gap-1.5">
          {STEPS.map((s, idx) => (
            <div key={s} className="h-2 flex-1 overflow-hidden rounded-full bg-soft">
              <motion.div className="h-full bg-accent" initial={false} animate={{ width: idx <= step ? "100%" : "0%" }} transition={{ duration: 0.5 }} />
            </div>
          ))}
        </div>

        <div className="mt-5 h-16">
          <AnimatePresence mode="wait">
            <motion.div
              key={STEPS[step]}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-3"
            >
              <span className="text-3xl">{STATUS_EMOJI[STEPS[step]]}</span>
              <span className="font-display text-xl font-semibold">{t(STEPS[step])}</span>
            </motion.div>
          </AnimatePresence>
        </div>

        <ul className="space-y-2.5">
          {[
            ["Oil 5W-30 + filter", "1 850 ₴"],
            ["Front brake pads", "2 400 ₴"],
            ["Cabin filter", "450 ₴"],
          ].map(([name, cost], idx) => (
            <li
              key={name}
              className={cn(
                "flex items-center justify-between rounded-2xl bg-soft px-4 py-3 text-sm transition-opacity duration-500",
                idx <= step - 1 ? "opacity-100" : "opacity-30",
              )}
            >
              <span className="flex items-center gap-2">
                <Check className="size-4 text-success" /> {name}
              </span>
              <span className="tabular font-semibold">{cost}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
