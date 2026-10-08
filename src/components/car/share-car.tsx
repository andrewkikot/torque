"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Share2, Copy, Send, RefreshCw, ExternalLink, Eye } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/field";
import { saveShareAction, regenerateShareAction } from "@/app/actions/cars";
import type { CarShareOptions } from "@/db/schema";

type Share = { token: string; enabled: boolean; options: CarShareOptions; views: number } | null;

const FIELDS: (keyof CarShareOptions)[] = ["history", "costs", "receipts", "workshops", "maintenance", "odometer", "plate", "vin"];

/** Owner controls for the public "car passport" link. */
export function ShareCar({ carId, appUrl, initial, defaults }: { carId: string; appUrl: string; initial: Share; defaults: CarShareOptions }) {
  const t = useTranslations("share");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [share, setShare] = useState<Share>(initial);
  const [options, setOptions] = useState<CarShareOptions>(initial?.options ?? defaults);
  const [busy, setBusy] = useState(false);
  const url = share ? `${appUrl}/c/${share.token}` : null;

  async function save(input: { enabled?: boolean; options?: CarShareOptions }) {
    setBusy(true);
    const r = await saveShareAction(carId, input);
    setBusy(false);
    if (!r.ok) {
      toast.error(r.error);
      return false;
    }
    setShare(r.data);
    setOptions(r.data.options);
    return true;
  }

  const toggle = async (k: keyof CarShareOptions, v: boolean) => {
    const next = { ...options, [k]: v };
    // Costs and receipts only make sense together with history.
    if (k === "history" && !v) Object.assign(next, { costs: false, receipts: false });
    if ((k === "costs" || k === "receipts") && v) next.history = true;
    setOptions(next);
    if (share) await save({ options: next });
  };

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(tc("copied"));
    } catch {
      toast(url);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="grid size-10 place-items-center rounded-full bg-black/30 text-white backdrop-blur-md hover:bg-black/45"
        aria-label={t("button")}
      >
        <Share2 className="size-4" />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t("title")}>
        <div className="flex flex-col gap-5">
          <p className="text-sm text-muted">{t("sub")}</p>

          {share && (
            <div className="flex flex-col gap-3 rounded-3xl bg-soft p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold">{share.enabled ? t("on") : t("off")}</span>
                <Switch checked={share.enabled} onChange={(v) => save({ enabled: v })} label="" disabled={busy} />
              </div>
              {share.enabled && url && (
                <>
                  <div className="truncate rounded-xl bg-card px-3 py-2 font-mono text-xs">{url}</div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={async () => (navigator.share ? navigator.share({ url }).catch(() => {}) : copy())}>
                      <Send /> {tc("share")}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={copy}>
                      <Copy /> {tc("copy")}
                    </Button>
                    <a href={url} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold hover:bg-card">
                      <ExternalLink className="size-4" /> {t("preview")}
                    </a>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <Eye className="size-3.5" /> {t("views", { count: share.views })}
                    </span>
                    <button
                      className="inline-flex items-center gap-1 font-semibold hover:text-fg"
                      onClick={async () => {
                        const r = await regenerateShareAction(carId);
                        if (!r.ok) return toast.error(r.error);
                        setShare(r.data);
                        toast.success(t("regenerated"));
                      }}
                    >
                      <RefreshCw className="size-3.5" /> {t("regenerate")}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          <div>
            <div className="mb-1 text-sm font-bold">{t("whatToShow")}</div>
            <p className="mb-2 text-xs text-muted">{t("always")}</p>
            <div className="divide-y divide-border">
              {FIELDS.map((k) => (
                <Switch key={k} checked={options[k]} onChange={(v) => toggle(k, v)} label={t(`field.${k}`)} description={t(`fieldHint.${k}`)} disabled={busy} />
              ))}
            </div>
          </div>

          {!share && (
            <Button size="lg" loading={busy} onClick={() => save({ enabled: true, options })}>
              <Share2 /> {t("create")}
            </Button>
          )}
        </div>
      </Sheet>
    </>
  );
}
