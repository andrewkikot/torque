"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import QRCode from "qrcode";
import { QrCode, RefreshCw, Loader2 } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { checkinCodeAction } from "@/app/actions/cars";
import { cn } from "@/lib/utils";

/**
 * The owner shows this at the workshop. The mechanic points their phone camera at the QR
 * (which opens Torque's check-in page) or types the code. The code works once.
 */
export function ShowToMechanic({
  carId,
  appUrl,
  variant = "tile",
  className,
}: {
  carId: string;
  appUrl: string;
  variant?: "tile" | "button";
  className?: string;
}) {
  const t = useTranslations("checkin");
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load(rotate = false) {
    setBusy(true);
    const r = await checkinCodeAction(carId, rotate);
    setBusy(false);
    if (!r.ok) return toast.error(r.error);
    setCode(r.data.code);
    setSvg(
      await QRCode.toString(`${appUrl}/w/checkin/${r.data.code}`, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#1c1917", light: "#ffffff" } }),
    );
  }

  const openSheet = () => {
    setOpen(true);
    if (!code) load();
  };

  return (
    <>
      {variant === "tile" ? (
        <button
          onClick={openSheet}
          className={cn(
            "flex flex-col items-center justify-center gap-1.5 rounded-3xl border border-border bg-card px-2 py-3 text-center text-xs font-semibold shadow-card active:scale-[0.97]",
            className,
          )}
        >
          <span className="grid size-10 place-items-center rounded-2xl bg-accent-soft text-accent">
            <QrCode className="size-5" />
          </span>
          <span className="line-clamp-2 leading-tight">{t("button")}</span>
        </button>
      ) : (
        <Button variant="outline" onClick={openSheet} className={className}>
          <QrCode /> {t("button")}
        </Button>
      )}
      <Sheet open={open} onClose={() => setOpen(false)} title={t("title")}>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="grid aspect-square w-full max-w-64 place-items-center rounded-3xl bg-white p-3 shadow-card">
            {svg ? (
              // QR is generated locally from our own URL; safe to inline.
              <div className="size-full [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} />
            ) : (
              <Loader2 className="size-6 animate-spin text-stone-400" />
            )}
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted">{t("codeLabel")}</div>
            <div className="tabular select-all font-mono text-3xl font-bold tracking-[0.15em]">{code ? `TQ-${code}` : "······"}</div>
          </div>
          <ol className="w-full space-y-1.5 rounded-2xl bg-soft p-4 text-left text-sm text-muted">
            <li>1. {t("step1")}</li>
            <li>2. {t("step2")}</li>
            <li>3. {t("step3")}</li>
          </ol>
          <Button variant="ghost" size="sm" loading={busy} onClick={() => load(true)}>
            <RefreshCw /> {t("newCode")}
          </Button>
        </div>
      </Sheet>
    </>
  );
}
