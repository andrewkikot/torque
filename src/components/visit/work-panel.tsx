"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Badge } from "@/components/ui/card";
import { Sheet } from "@/components/ui/sheet";
import { WorkForm, type WorkPayload } from "@/components/work/work-form";
import { CATEGORY_EMOJI } from "@/components/work/categories";
import { formatMoney } from "@/lib/format";
import { visitTotalClient } from "./total";
import type { VisitWork } from "./types";

type R = { ok: true } | { ok: false; error: string };

export function WorkPanel({
  items,
  currency,
  units,
  closed,
  onAdd,
  onRemove,
  shareToken,
  addLabel,
  readOnly,
}: {
  items: VisitWork[];
  currency: string;
  units: string;
  closed: boolean;
  onAdd?: (p: WorkPayload) => Promise<R>;
  onRemove?: (id: string) => Promise<R>;
  shareToken?: string;
  addLabel?: string;
  /** Owner/customer view: no add/remove controls. */
  readOnly?: boolean;
}) {
  const t = useTranslations("visit");
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const total = visitTotalClient(items);

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display font-semibold">{t("work")}</h3>
        {!closed && !readOnly && (
          <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
            <Plus /> {t("addWork")}
          </Button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted">{t("noWorkYet")}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {items.map((i) => (
            <li key={i.id} className="group flex items-center gap-3 py-2.5">
              <span className="text-lg">{CATEGORY_EMOJI[i.category]}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{i.name}</span>
                {!i.approved && <Badge tone="warning">{t("pending")}</Badge>}
              </span>
              <span className={`tabular text-sm font-semibold ${i.approved ? "" : "text-muted line-through decoration-dotted"}`}>
                {formatMoney(Number(i.cost), currency, locale)}
              </span>
              {onRemove && !closed && (
                <button
                  className="grid size-7 place-items-center rounded-lg text-muted opacity-0 hover:bg-soft group-hover:opacity-100 max-lg:opacity-100"
                  aria-label="Remove"
                  onClick={async () => {
                    const r = await onRemove(i.id);
                    if (!r.ok) toast.error(r.error);
                    router.refresh();
                  }}
                >
                  <X className="size-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <span className="text-sm font-semibold text-muted">{t("total")}</span>
        <span className="tabular font-display text-xl font-bold">{formatMoney(total, currency, locale)}</span>
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} title={addLabel ?? t("addWork")}>
        <WorkForm
          compact
          currency={currency}
          units={units}
          shareToken={shareToken}
          onSubmit={onAdd ?? (async () => ({ ok: false, error: "read-only" }))}
          onDone={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </Sheet>
    </Card>
  );
}
