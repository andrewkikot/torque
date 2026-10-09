"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CloudSun, X } from "lucide-react";

const KEY = "torque:tyre-nudge-dismissed";

/** One-time invite to set a region so tyre reminders can work. Dismissal is per device. */
export function TyreNudge() {
  const t = useTranslations("tyres");
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(KEY) === "1";
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading a per-device preference after mount
    setHidden(dismissed);
  }, []);
  if (hidden) return null;
  return (
    <div className="mb-6 flex items-center gap-3 rounded-3xl border border-sky-500/30 bg-sky-500/5 p-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-sky-500 text-white">
        <CloudSun className="size-5" />
      </span>
      <Link href="/settings#weather" className="min-w-0 flex-1">
        <span className="block font-semibold">{t("nudgeTitle")}</span>
        <span className="block text-sm text-muted">{t("nudgeSub")}</span>
      </Link>
      <button
        aria-label="Dismiss"
        className="grid size-8 place-items-center rounded-full text-muted hover:bg-soft"
        onClick={() => {
          try {
            localStorage.setItem(KEY, "1");
          } catch {}
          setHidden(true);
        }}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
