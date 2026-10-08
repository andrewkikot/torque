import Link from "next/link";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { Receipt } from "lucide-react";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { Badge } from "@/components/ui/card";
import { CATEGORY_EMOJI } from "./categories";
import { DeleteWorkButton } from "./delete-work-button";

type Item = {
  id: string;
  name: string;
  category: string;
  type: string;
  cost: string;
  quantity: string;
  currency: string;
  odometer: number | null;
  performedAt: Date;
  notes: string | null;
  partNumber: string | null;
  receiptUrl: string | null;
  diy: boolean;
  visit: { id: string; title: string; shopName: string | null } | null;
};

/** Service-book timeline, grouped by month. */
export function HistoryList({ items, units, carId, readOnly }: { items: Item[]; units: string; carId: string; readOnly?: boolean }) {
  const t = useTranslations();
  const locale = useLocale();
  const tz = useTimeZone();
  const groups = new Map<string, Item[]>();
  for (const i of items) {
    const key = formatDate(i.performedAt, locale, { month: "long", year: "numeric" }, tz);
    groups.set(key, [...(groups.get(key) ?? []), i]);
  }
  return (
    <div className="flex flex-col gap-8">
      {[...groups].map(([month, list]) => (
        <section key={month}>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">{month}</h3>
          <ol className="relative ml-5 border-l-2 border-border">
            {list.map((i) => (
              <li key={i.id} className="group relative mb-3 ml-6 break-inside-avoid">
                <span className="absolute -left-[42px] top-3 grid size-8 place-items-center rounded-full border-4 border-bg bg-accent-soft text-sm">
                  {CATEGORY_EMOJI[i.category] ?? "🔧"}
                </span>
                <div className="rounded-3xl border border-border bg-card p-4 shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold">
                        {i.name}
                        {Number(i.quantity) !== 1 && <span className="text-muted"> ×{Number(i.quantity)}</span>}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
                        <span>{formatDate(i.performedAt, locale, undefined, tz)}</span>
                        {i.odometer != null && (
                          <span className="tabular">
                            · {formatNumber(i.odometer, locale)} {units}
                          </span>
                        )}
                        <Badge>{t(`category.${i.category}`)}</Badge>
                        {i.diy && <Badge tone="accent">{t("history.diy")}</Badge>}
                        {i.visit && (
                          <Link href={`/visits/${i.visit.id}`} className="no-print">
                            <Badge tone="accent">🔧 {i.visit.shopName || i.visit.title}</Badge>
                          </Link>
                        )}
                      </div>
                      {(i.notes || i.partNumber) && (
                        <p className="mt-2 text-sm text-muted">
                          {i.partNumber && <span className="mr-2 font-mono text-xs">#{i.partNumber}</span>}
                          {i.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span className="tabular font-display font-semibold">{formatMoney(Number(i.cost), i.currency, locale)}</span>
                      <div className="no-print flex items-center gap-1">
                        {i.receiptUrl && (
                          <a href={i.receiptUrl} target="_blank" rel="noreferrer" className="grid size-8 place-items-center rounded-xl text-muted hover:bg-soft" aria-label={t("work.receipt")}>
                            <Receipt className="size-4" />
                          </a>
                        )}
                        {!readOnly && <DeleteWorkButton carId={carId} workId={i.id} />}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
