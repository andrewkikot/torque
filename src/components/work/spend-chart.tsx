import { useLocale, useTranslations } from "next-intl";
import { formatMoney } from "@/lib/format";
import { CATEGORY_EMOJI } from "./categories";

/**
 * Spend by category: one measure across categories → single-hue horizontal bars,
 * values as direct labels in text ink (no legend needed for a single series).
 */
export function SpendChart({ data, currency }: { data: { category: string; total: number; count: number }[]; currency: string }) {
  const t = useTranslations();
  const locale = useLocale();
  const rows = data.filter((d) => d.total > 0).slice(0, 7);
  const max = Math.max(...rows.map((r) => r.total), 1);
  const total = data.reduce((a, r) => a + r.total, 0);
  if (!rows.length) return null;
  return (
    <figure>
      <figcaption className="mb-3 text-sm font-semibold">{t("history.byCategory")}</figcaption>
      <ul className="flex flex-col gap-2.5">
        {rows.map((r) => {
          const share = Math.round((r.total / total) * 100);
          const label = `${t(`category.${r.category}`)}: ${formatMoney(r.total, currency, locale)} (${share}%, ${t("history.entries", { count: r.count })})`;
          return (
            <li key={r.category} className="group grid grid-cols-[7.5rem_1fr] items-center gap-3 text-sm" title={label} aria-label={label}>
              <span className="truncate text-muted">
                {CATEGORY_EMOJI[r.category]} {t(`category.${r.category}`)}
              </span>
              <span className="flex items-center gap-2">
                <span className="h-3 rounded-r-[4px] bg-accent transition-[filter] group-hover:brightness-110" style={{ width: `${Math.max(2, (r.total / max) * 100)}%` }} />
                <span className="tabular shrink-0 text-xs font-semibold">{formatMoney(r.total, currency, locale)}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}
