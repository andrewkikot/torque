"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { LayoutGrid, Plus, Users, CarFront } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";

const items = [
  { href: "/w", key: "board", icon: LayoutGrid, exact: true },
  { href: "/w/new", key: "newJob", icon: Plus, exact: false },
  { href: "/w/settings", key: "team", icon: Users, exact: false },
  { href: "/garage", key: "myGarage", icon: CarFront, exact: false },
] as const;

/** Workshop area chrome: a slim header with the workshop name, bottom tabs on phones, sidebar on desktop. */
export function WorkshopNav({ name }: { name: string }) {
  const t = useTranslations("workshop.nav");
  const pathname = usePathname();
  const active = (href: string, exact: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(href + "/"));

  return (
    <>
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-bg-elevated px-4 py-6 lg:flex">
        <Link href="/w" className="mb-2 px-2">
          <Logo />
        </Link>
        <div className="mb-8 truncate px-2 text-sm font-semibold text-muted">{name}</div>
        <nav className="flex flex-col gap-1">
          {items.map(({ href, key, icon: Icon, exact }) => {
            const on = active(href, exact);
            return (
              <Link
                key={href}
                href={href}
                className={cn("relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[15px] font-semibold transition", on ? "text-fg" : "text-muted hover:bg-soft hover:text-fg")}
              >
                {on && <motion.span layoutId="ws-pill" className="absolute inset-0 rounded-2xl bg-soft" />}
                <Icon className="relative size-5" />
                <span className="relative">{t(key)}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg-elevated/90 pb-safe backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4 px-2 pt-2">
          {items.map(({ href, key, icon: Icon, exact }) => {
            const on = active(href, exact);
            const primary = key === "newJob";
            return (
              <Link key={href} href={href} className="flex flex-col items-center gap-1 py-1">
                <span
                  className={cn(
                    "relative grid h-8 w-14 place-items-center rounded-full transition",
                    primary ? "bg-fg text-bg" : on ? "text-accent-fg" : "text-muted",
                  )}
                >
                  {on && !primary && <motion.span layoutId="ws-tab" className="absolute inset-0 rounded-full bg-accent" />}
                  <Icon className="relative size-5" />
                </span>
                <span className={cn("text-[11px] font-semibold", on ? "text-fg" : "text-muted")}>{t(key)}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
