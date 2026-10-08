"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export function CarTabs({ carId }: { carId: string }) {
  const t = useTranslations("car");
  const pathname = usePathname();
  const base = `/cars/${carId}`;
  const tabs = [
    { href: base, label: t("overview") },
    { href: `${base}/history`, label: t("history") },
    { href: `${base}/maintenance`, label: t("maintenance") },
    { href: `${base}/visits`, label: t("visits") },
  ];
  return (
    <nav className="no-print no-scrollbar -mx-4 mb-5 flex gap-1 overflow-x-auto px-4 [mask-image:linear-gradient(to_right,black_85%,transparent)] sm:mx-0 sm:px-0 sm:[mask-image:none]">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn("relative shrink-0 whitespace-nowrap rounded-2xl px-3.5 py-2 text-sm font-semibold transition", active ? "text-accent-fg" : "text-muted hover:text-fg")}
          >
            {active && <motion.span layoutId="car-tab" className="absolute inset-0 rounded-2xl bg-accent" transition={{ type: "spring", damping: 30, stiffness: 400 }} />}
            <span className="relative">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
