"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Switch, Textarea, Segmented } from "@/components/ui/field";
import { PhotoButton } from "@/components/photo-upload";
import { CATEGORIES, CATEGORY_EMOJI } from "./categories";
import { cn } from "@/lib/utils";

export type WorkPayload = {
  name: string;
  category: string;
  type: "labor" | "part" | "fluid";
  cost: number;
  quantity: number;
  odometer?: number | null;
  performedAt?: string;
  partNumber?: string | null;
  notes?: string | null;
  diy?: boolean;
  receiptUrl?: string | null;
  maintenancePlanId?: string | null;
};

type Result = { ok: true } | { ok: false; error: string };

export function WorkForm({
  onSubmit,
  onDone,
  currency,
  units,
  defaultOdometer,
  plans,
  compact,
  shareToken,
  submitLabel,
}: {
  onSubmit: (p: WorkPayload) => Promise<Result>;
  onDone?: () => void;
  currency: string;
  units: string;
  defaultOdometer?: number;
  /** When provided (standalone work), lets the user pick which reminder this resets. */
  plans?: { id: string; name: string }[];
  /** Visit/shop mode: hides date, mileage, DIY. */
  compact?: boolean;
  shareToken?: string;
  submitLabel?: string;
}) {
  const t = useTranslations();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("other");
  const [type, setType] = useState<WorkPayload["type"]>("labor");
  const [cost, setCost] = useState("");
  const [qty, setQty] = useState("1");
  const [odometer, setOdometer] = useState(defaultOdometer ? String(defaultOdometer) : "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [partNumber, setPartNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [diy, setDiy] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [planId, setPlanId] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await onSubmit({
      name,
      category,
      type,
      cost: Number(cost.replace(",", ".")) || 0,
      quantity: Number(qty.replace(",", ".")) || 1,
      odometer: compact ? undefined : odometer ? Number(odometer.replace(/\D/g, "")) : null,
      performedAt: compact ? undefined : date,
      partNumber: partNumber || null,
      notes: notes || null,
      diy: compact ? false : diy,
      receiptUrl,
      maintenancePlanId: planId || null,
    });
    setBusy(false);
    if (!r.ok) return toast.error(r.error);
    toast.success(t("work.added"));
    onDone?.();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label={t("work.name")}>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("work.namePlaceholder")} required autoFocus maxLength={120} />
      </Field>

      <div>
        <span className="mb-1.5 block text-sm font-semibold">{t("work.category")}</span>
        <div className="no-scrollbar -mx-1 flex flex-wrap gap-1.5 px-1">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cn(
                "rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition",
                category === c ? "border-accent bg-accent text-accent-fg" : "border-border bg-card hover:bg-soft",
              )}
            >
              {CATEGORY_EMOJI[c]} {t(`category.${c}`)}
            </button>
          ))}
        </div>
      </div>

      <Segmented
        value={type}
        onChange={setType}
        options={(["labor", "part", "fluid"] as const).map((v) => ({ value: v, label: t(`workType.${v}`) }))}
      />

      <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-3">
        <Field label={`${t("work.cost")} (${currency})`}>
          <Input inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value.replace(/[^\d.,]/g, ""))} placeholder="0" />
        </Field>
        <Field label={t("work.quantity")}>
          <Input inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value.replace(/[^\d.,]/g, ""))} />
        </Field>
      </div>

      {!compact && (
        <div className="grid grid-cols-2 gap-3">
          <Field label={`${t("work.odometer")} (${units})`}>
            <Input inputMode="numeric" value={odometer} onChange={(e) => setOdometer(e.target.value.replace(/[^\d]/g, ""))} />
          </Field>
          <Field label={t("work.date")}>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
          </Field>
        </div>
      )}

      {type !== "labor" && (
        <Field label={t("work.partNumber")} optional={t("common.optional")}>
          <Input value={partNumber} onChange={(e) => setPartNumber(e.target.value)} className="font-mono" />
        </Field>
      )}

      {plans && plans.length > 0 && (
        <Field label={t("work.plan")}>
          <Select value={planId} onChange={(e) => setPlanId(e.target.value)}>
            <option value="">{t("work.planAuto")}</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <Field label={t("work.notes")} optional={t("common.optional")}>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </Field>

      <div className="flex items-center gap-3">
        <PhotoButton folder="receipts" shareToken={shareToken} label={t("work.receipt")} onUploaded={setReceiptUrl} />
        {receiptUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={receiptUrl} alt="" className="size-10 rounded-xl object-cover" />
        )}
      </div>

      {!compact && <Switch checked={diy} onChange={setDiy} label={t("work.diy")} />}

      <Button type="submit" size="lg" loading={busy} className="mt-2">
        {submitLabel ?? t("common.save")}
      </Button>
    </form>
  );
}
