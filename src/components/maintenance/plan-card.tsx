"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { toast } from "sonner";
import { CheckCircle2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { Sheet } from "@/components/ui/sheet";
import { Field, Input, Switch } from "@/components/ui/field";
import { ConfirmButton } from "@/components/ui/confirm";
import { CATEGORY_EMOJI } from "@/components/work/categories";
import { PlanForm } from "./plan-form";
import { markPlanDoneAction, updatePlanAction, deletePlanAction } from "@/app/actions/work";
import { fireConfetti } from "@/components/confetti";
import { formatDate, formatNumber } from "@/lib/format";
import type { DueInfo } from "@/lib/domain/maintenance";
import { cn } from "@/lib/utils";

export type PlanView = {
  id: string;
  name: string;
  category: string;
  intervalKm: number | null;
  intervalMonths: number | null;
  lastDoneAt: string | null;
  lastDoneOdometer: number | null;
  due: Omit<DueInfo, "dueDate"> & { dueDate: string | null };
};

export function PlanCard({ plan, carId, units, odometer, children }: { plan: PlanView; carId: string; units: string; odometer: number; children: React.ReactNode }) {
  const t = useTranslations();
  const locale = useLocale();
  const tz = useTimeZone();
  const router = useRouter();
  const [doneOpen, setDoneOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [cost, setCost] = useState("");
  const [odo, setOdo] = useState(String(odometer));
  const [diy, setDiy] = useState(false);
  const [busy, setBusy] = useState(false);

  const status = plan.due.status;
  const tone = status === "overdue" ? "danger" : status === "soon" ? "warning" : status === "ok" ? "success" : "neutral";
  const barColor = status === "overdue" ? "bg-danger" : status === "soon" ? "bg-warning" : "bg-success";

  const every = [
    plan.intervalKm ? `${formatNumber(plan.intervalKm, locale)} ${units}` : null,
    plan.intervalMonths ? t("maintenance.months", { count: plan.intervalMonths }) : null,
  ]
    .filter(Boolean)
    .join(" / ");

  return (
    <div className={cn("rounded-3xl border bg-card p-4 shadow-card", status === "overdue" ? "border-danger/40" : "border-border")}>
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-soft text-xl">{CATEGORY_EMOJI[plan.category] ?? "🔧"}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{plan.name}</span>
            <Badge tone={tone}>{t(`maintenance.${status}`)}</Badge>
          </div>
          <div className="mt-0.5 text-sm text-muted">
            {t("maintenance.every")} {every}
          </div>
          <div className={cn("mt-1 text-sm font-medium", status === "overdue" ? "text-danger" : status === "soon" ? "text-warning" : "text-fg")}>{children}</div>
        </div>
        <div className="relative">
          <Button variant="ghost" size="icon-sm" onClick={() => setMenu((m) => !m)} aria-label="More">
            <MoreHorizontal />
          </Button>
          {menu && (
            <div className="absolute right-0 top-9 z-20 w-40 rounded-2xl border border-border bg-bg-elevated p-1 shadow-xl" onMouseLeave={() => setMenu(false)}>
              <button
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-soft"
                onClick={() => {
                  setMenu(false);
                  setEditOpen(true);
                }}
              >
                <Pencil className="size-4" /> {t("common.edit")}
              </button>
              <ConfirmButton
                size="sm"
                className="w-full justify-start"
                confirmLabel={t("common.delete")}
                onConfirm={async () => {
                  const r = await deletePlanAction(carId, plan.id);
                  if (!r.ok) return toast.error(r.error);
                  router.refresh();
                }}
              >
                <Trash2 /> {t("common.delete")}
              </ConfirmButton>
            </div>
          )}
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-soft">
        <motion.div
          className={cn("h-full rounded-full", barColor)}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, plan.due.progress * 100)}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted">
        <span>
          {t("maintenance.lastDone")}: {plan.lastDoneAt ? formatDate(plan.lastDoneAt, locale, undefined, tz) : "—"}
          {plan.lastDoneOdometer != null && ` · ${formatNumber(plan.lastDoneOdometer, locale)} ${units}`}
        </span>
        <Button size="sm" variant={status === "overdue" || status === "soon" ? "primary" : "secondary"} onClick={() => setDoneOpen(true)}>
          <CheckCircle2 /> {t("maintenance.markDone")}
        </Button>
      </div>

      <Sheet open={doneOpen} onClose={() => setDoneOpen(false)} title={`${t("maintenance.markDone")}: ${plan.name}`}>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("work.cost")}>
              <Input inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0" autoFocus />
            </Field>
            <Field label={`${t("work.odometer")} (${units})`}>
              <Input inputMode="numeric" value={odo} onChange={(e) => setOdo(e.target.value)} />
            </Field>
          </div>
          <Switch checked={diy} onChange={setDiy} label={t("work.diy")} />
          <Button
            size="lg"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              const r = await markPlanDoneAction(carId, plan.id, {
                cost: Number(cost.replace(",", ".")) || 0,
                odometer: Number(odo.replace(/\D/g, "")) || undefined,
                diy,
              });
              setBusy(false);
              if (!r.ok) return toast.error(r.error);
              fireConfetti(getComputedStyle(document.documentElement).getPropertyValue("--accent"));
              toast.success(t("maintenance.markedDone"));
              setDoneOpen(false);
              router.refresh();
            }}
          >
            {t("common.done")}
          </Button>
        </div>
      </Sheet>

      <Sheet open={editOpen} onClose={() => setEditOpen(false)} title={plan.name}>
        <PlanForm
          units={units}
          initial={{
            name: plan.name,
            category: plan.category,
            intervalKm: plan.intervalKm ? String(plan.intervalKm) : "",
            intervalMonths: plan.intervalMonths ? String(plan.intervalMonths) : "",
            lastDoneAt: plan.lastDoneAt?.slice(0, 10) ?? "",
            lastDoneOdometer: plan.lastDoneOdometer != null ? String(plan.lastDoneOdometer) : "",
          }}
          onSubmit={async (v) => {
            const r = await updatePlanAction(carId, plan.id, v);
            return r.ok ? { ok: true } : r;
          }}
          onDone={() => {
            setEditOpen(false);
            router.refresh();
          }}
        />
      </Sheet>
    </div>
  );
}
