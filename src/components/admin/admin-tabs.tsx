"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function AdminTabs() {
  const t = useTranslations("admin");
  const pathname = usePathname();
  const tabs = [
    { href: "/admin", label: t("licenses") },
    { href: "/admin/workshops", label: t("workshops") },
  ];
  return (
    <nav className="-mb-px flex gap-4">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn("border-b-2 py-2.5 text-sm font-semibold", pathname === tab.href ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg")}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
