"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { LayoutGrid, Plus, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { ModeMemory, ModeSwitchSegmented, ModeSwitchTab } from "@/components/mode-switch";

const items = [
  { href: "/w", key: "board", icon: LayoutGrid, exact: true },
  { href: "/w/new", key: "newJob", icon: Plus, exact: false },
  { href: "/w/settings", key: "settings", icon: Store, exact: false },
] as const;

type WorkshopInfo = { name: string; logoUrl: string | null; accentColor: string };

/**
 * Workshop (shop) navigation. Deliberately darker than the garage side so it's
 * obvious which side you're on; the last slot switches back to "My garage".
 */
export function WorkshopNav({ workshop }: { workshop: WorkshopInfo }) {
  const t = useTranslations("workshop.nav");
  const pathname = usePathname();
  const active = (href: string, exact: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(href + "/"));

  return (
    <>
      <ModeMemory mode="workshop" />
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/10 bg-stone-950 px-4 py-6 text-white lg:flex">
        <Link href="/w" className="mb-5 px-2 text-white">
          <Logo />
        </Link>
        <div className="mb-6">
          <ModeSwitchSegmented mode="workshop" workshop={workshop} dark />
        </div>
        <nav className="flex flex-col gap-1">
          {items.map(({ href, key, icon: Icon, exact }) => {
            const on = active(href, exact);
            return (
              <Link
                key={href}
                href={href}
                className={cn("relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[15px] font-semibold transition", on ? "text-white" : "text-white/60 hover:bg-white/5 hover:text-white")}
              >
                {on && <motion.span layoutId="ws-pill" className="absolute inset-0 rounded-2xl bg-white/10" />}
                <Icon className="relative size-5" />
                <span className="relative">{t(key)}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-stone-950/95 pb-safe text-white backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4 px-1 pt-2">
          {items.map(({ href, key, icon: Icon, exact }) => {
            const on = active(href, exact);
            return (
              <Link key={href} href={href} className="flex flex-col items-center gap-1 py-1">
                <span className={cn("relative grid h-8 w-12 place-items-center rounded-full transition", on ? "text-accent-fg" : "text-white/60")}>
                  {on && <motion.span layoutId="ws-tab" className="absolute inset-0 rounded-full bg-accent" />}
                  <Icon className="relative size-5" />
                </span>
                <span className={cn("max-w-full truncate px-0.5 text-[11px] font-semibold", on ? "text-white" : "text-white/60")}>{t(key)}</span>
              </Link>
            );
          })}
          <ModeSwitchTab mode="workshop" workshop={workshop} dark />
        </div>
      </nav>
    </>
  );
}
