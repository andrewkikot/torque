"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ListChecks, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/field";
import { canTransition, nextStatus, STATUS_EMOJI, VISIT_PIPELINE, type VisitStatusValue } from "@/lib/domain/visit-status";
import { fireConfetti } from "@/components/confetti";
import { cn } from "@/lib/utils";

type R = { ok: true } | { ok: false; error: string };

/** Status changer used by both owners and shops (shops get a restricted list). */
export function StatusControls({
  status,
  onChange,
  allowed,
  successMessage,
}: {
  status: VisitStatusValue;
  onChange: (to: VisitStatusValue, message?: string) => Promise<R>;
  allowed?: VisitStatusValue[];
  successMessage?: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const isAllowed = (s: VisitStatusValue) => canTransition(status, s) && (!allowed || allowed.includes(s));
  const next = nextStatus(status);
  const options = ([...VISIT_PIPELINE, "cancelled"] as VisitStatusValue[]).filter(isAllowed);

  async function go(to: VisitStatusValue) {
    setBusy(to);
    const r = await onChange(to, message || undefined);
    setBusy(null);
    if (!r.ok) return toast.error(r.error);
    if (to === "completed") {
      fireConfetti(getComputedStyle(document.documentElement).getPropertyValue("--accent"));
      toast.success(t("visit.completedToast"));
    } else if (successMessage) toast.success(successMessage);
    setOpen(false);
    setMessage("");
    router.refresh();
  }

  if (!options.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {next && isAllowed(next) && (
        <Button onClick={() => go(next)} loading={busy === next} className="flex-1 sm:flex-none">
          {next === "completed" ? <Flag /> : <span>{STATUS_EMOJI[next]}</span>}
          {next === "completed" ? t("visit.complete") : t("visit.advance", { status: t(`status.${next}`) })}
        </Button>
      )}
      <Button variant="outline" onClick={() => setOpen(true)}>
        <ListChecks /> {t("visit.setStatus")}
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t("visit.setStatus")}>
        <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t("visit.notePlaceholder")} rows={2} className="mb-4" />
        <div className="grid gap-2">
          {options.map((s) => (
            <button
              key={s}
              disabled={!!busy}
              onClick={() => go(s)}
              className={cn(
                "flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left font-semibold transition hover:border-accent hover:bg-accent-soft disabled:opacity-50",
                s === "cancelled" && "text-danger",
              )}
            >
              <span className="text-xl">{STATUS_EMOJI[s]}</span>
              {t(`status.${s}`)}
              {busy === s && <span className="ml-auto text-xs text-muted">…</span>}
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
