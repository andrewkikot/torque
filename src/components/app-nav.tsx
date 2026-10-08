"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { CarFront, Wrench, Sparkles, Settings2 } from "lucide-react";
import { ModeMemory, ModeSwitchSegmented, ModeSwitchTab } from "./mode-switch";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

const items = [
  { href: "/garage", key: "garage", icon: CarFront, match: ["/garage", "/cars"] },
  { href: "/visits", key: "service", icon: Wrench, match: ["/visits"] },
  { href: "/assistant", key: "assistant", icon: Sparkles, match: ["/assistant"] },
  { href: "/settings", key: "settings", icon: Settings2, match: ["/settings"] },
] as const;

type WorkshopInfo = { name: string; logoUrl: string | null; accentColor: string } | null;

/** Client (car owner) navigation. Workshop members also get a switch to their workshop. */
export function AppNav({ userName, workshop }: { userName: string; workshop: WorkshopInfo }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const isActive = (m: readonly string[]) => m.some((p) => pathname === p || pathname.startsWith(p + "/"));

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-bg-elevated px-4 py-6 lg:flex">
        <ModeMemory mode="garage" />
        <Link href="/garage" className={cn("px-2", workshop ? "mb-5" : "mb-8")}>
          <Logo />
        </Link>
        {workshop && (
          <div className="mb-6">
            <ModeSwitchSegmented mode="garage" workshop={workshop} />
          </div>
        )}
        <nav className="flex flex-col gap-1">
          {items.map(({ href, key, icon: Icon, match }) => {
            const active = isActive(match);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[15px] font-semibold transition",
                  active ? "text-fg" : "text-muted hover:bg-soft hover:text-fg",
                )}
              >
                {active && (
                  <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-2xl bg-soft" transition={{ type: "spring", damping: 30, stiffness: 400 }} />
                )}
                <Icon className="relative size-5" />
                <span className="relative">{t(key)}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto truncate px-3 text-sm text-muted">{userName}</div>
      </aside>

      {/* Mobile bottom bar */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg-elevated/90 pb-safe backdrop-blur-xl lg:hidden">
        <div className={cn("mx-auto grid max-w-md px-1 pt-2", workshop ? "grid-cols-5" : "grid-cols-4")}>
          {items.map(({ href, key, icon: Icon, match }) => {
            const active = isActive(match);
            return (
              <Link key={href} href={href} className="flex flex-col items-center gap-1 py-1">
                <span className={cn("relative grid h-8 w-12 place-items-center rounded-full transition", active ? "text-accent-fg" : "text-muted")}>
                  {active && (
                    <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-full bg-accent" transition={{ type: "spring", damping: 30, stiffness: 400 }} />
                  )}
                  <Icon className="relative size-5" />
                </span>
                <span className={cn("max-w-full truncate px-0.5 text-[11px] font-semibold", active ? "text-fg" : "text-muted")}>{t(key)}</span>
              </Link>
            );
          })}
          {workshop && <ModeSwitchTab mode="garage" workshop={workshop} />}
        </div>
      </nav>
    </>
  );
}
