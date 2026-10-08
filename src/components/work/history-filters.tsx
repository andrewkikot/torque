"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Select } from "@/components/ui/field";
import { CATEGORIES, CATEGORY_EMOJI } from "./categories";

export function HistoryFilters({ years }: { years: number[] }) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const update = (key: string, value: string) => {
    const p = new URLSearchParams(params);
    if (value) p.set(key, value);
    else p.delete(key);
    router.replace(`${pathname}?${p}`, { scroll: false });
  };
  return (
    <div className="grid grid-cols-2 gap-2 sm:flex">
      <Select value={params.get("category") ?? ""} onChange={(e) => update("category", e.target.value)} className="h-10 text-sm">
        <option value="">{t("history.filterAll")}</option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {CATEGORY_EMOJI[c]} {t(`category.${c}`)}
          </option>
        ))}
      </Select>
      <Select value={params.get("year") ?? ""} onChange={(e) => update("year", e.target.value)} className="h-10 text-sm">
        <option value="">{t("history.allYears")}</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </Select>
    </div>
  );
}
