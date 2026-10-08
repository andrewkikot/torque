"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { CATEGORIES, CATEGORY_EMOJI } from "@/components/work/categories";
import { cn } from "@/lib/utils";

export type PlanFormValues = {
  name: string;
  category: string;
  intervalKm: string;
  intervalMonths: string;
  lastDoneAt: string;
  lastDoneOdometer: string;
};

export function PlanForm({
  initial,
  units,
  onSubmit,
  onDone,
}: {
  initial?: Partial<PlanFormValues>;
  units: string;
  onSubmit: (v: Record<string, unknown>) => Promise<{ ok: true } | { ok: false; error: string }>;
  onDone: () => void;
}) {
  const t = useTranslations();
  const [v, setV] = useState<PlanFormValues>({
    name: "",
    category: "other",
    intervalKm: "",
    intervalMonths: "",
    lastDoneAt: new Date().toISOString().slice(0, 10),
    lastDoneOdometer: "",
    ...initial,
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof PlanFormValues, val: string) => setV((p) => ({ ...p, [k]: val }));
  const num = (s: string) => (s ? Number(s.replace(/\D/g, "")) : null);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const r = await onSubmit({
          name: v.name,
          category: v.category,
          intervalKm: num(v.intervalKm),
          intervalMonths: num(v.intervalMonths),
          lastDoneAt: v.lastDoneAt || null,
          lastDoneOdometer: num(v.lastDoneOdometer),
        });
        setBusy(false);
        if (!r.ok) return toast.error(r.error);
        onDone();
      }}
    >
      <Field label={t("maintenance.name")}>
        <Input value={v.name} onChange={(e) => set("name", e.target.value)} required autoFocus />
      </Field>
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => set("category", c)}
            className={cn(
              "rounded-xl border px-2.5 py-1.5 text-xs font-semibold",
              v.category === c ? "border-accent bg-accent text-accent-fg" : "border-border bg-card hover:bg-soft",
            )}
          >
            {CATEGORY_EMOJI[c]} {t(`category.${c}`)}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={`${t("maintenance.intervalKm")} (${units})`}>
          <Input inputMode="numeric" value={v.intervalKm} onChange={(e) => set("intervalKm", e.target.value)} placeholder="10 000" />
        </Field>
        <Field label={t("maintenance.intervalMonths")}>
          <Input inputMode="numeric" value={v.intervalMonths} onChange={(e) => set("intervalMonths", e.target.value)} placeholder="12" />
        </Field>
        <Field label={t("maintenance.lastDone")}>
          <Input type="date" value={v.lastDoneAt} onChange={(e) => set("lastDoneAt", e.target.value)} />
        </Field>
        <Field label={`${t("maintenance.lastDoneOdometer")}`}>
          <Input inputMode="numeric" value={v.lastDoneOdometer} onChange={(e) => set("lastDoneOdometer", e.target.value)} />
        </Field>
      </div>
      <Button type="submit" size="lg" loading={busy} disabled={!v.intervalKm && !v.intervalMonths}>
        {t("common.save")}
      </Button>
    </form>
  );
}
