"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";
import { setLocaleCookieAction } from "@/app/actions/settings";
import { cn } from "@/lib/utils";

export function LocaleSwitch({ className }: { className?: string }) {
  const locale = useLocale();
  const [pending, start] = useTransition();
  return (
    <div className={cn("inline-flex rounded-xl bg-soft p-0.5 text-xs font-bold", pending && "opacity-60", className)}>
      {(["en", "uk"] as const).map((l) => (
        <button
          key={l}
          onClick={() => start(() => setLocaleCookieAction(l))}
          className={cn("rounded-lg px-2.5 py-1 uppercase transition", locale === l ? "bg-card shadow-sm" : "text-muted")}
        >
          {l === "uk" ? "UA" : "EN"}
        </button>
      ))}
    </div>
  );
}
