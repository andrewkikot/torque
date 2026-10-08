"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { logOdometerAction } from "@/app/actions/cars";
import { formatNumber } from "@/lib/format";

/** Mechanical-counter style digits that roll when the value changes. */
export function OdometerDigits({ value, className }: { value: number; className?: string }) {
  const locale = useLocale();
  const str = formatNumber(value, locale);
  return (
    <span className={className} aria-label={str}>
      {str.split("").map((ch, i) =>
        /\d/.test(ch) ? (
          <span key={`${str.length}-${i}`} className="relative inline-block h-[1em] w-[0.62em] overflow-hidden align-top leading-none">
            <motion.span
              className="absolute left-0 top-0 flex flex-col"
              initial={false}
              animate={{ y: `-${Number(ch)}em` }}
              transition={{ type: "spring", damping: 22, stiffness: 140, delay: i * 0.03 }}
            >
              {Array.from({ length: 10 }, (_, d) => (
                <span key={d} className="h-[1em] leading-none">
                  {d}
                </span>
              ))}
            </motion.span>
          </span>
        ) : (
          <span key={`${str.length}-${i}`} className="inline-block w-[0.3em]">
            {ch === "," || ch === "." ? ch : " "}
          </span>
        ),
      )}
    </span>
  );
}

export function OdometerWidget({ carId, value, units, perDay }: { carId: string; value: number; units: string; perDay: number }) {
  const t = useTranslations("car");
  const tc = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [confirmLower, setConfirmLower] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save(allowDecrease = false) {
    const n = Number(input.replace(/\D/g, ""));
    if (!input || Number.isNaN(n)) return;
    if (n < value && !allowDecrease) return setConfirmLower(true);
    setBusy(true);
    const r = await logOdometerAction(carId, n, allowDecrease);
    setBusy(false);
    if (!r.ok) return toast.error(r.error);
    toast.success(t("odometerUpdated"));
    setOpen(false);
    setInput("");
    setConfirmLower(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group flex items-center gap-3 rounded-3xl bg-black/25 px-4 py-2.5 text-left text-white backdrop-blur-md transition hover:bg-black/35"
      >
        <span>
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-white/70">{t("odometer")}</span>
          <span className="tabular font-display text-2xl font-bold">
            <OdometerDigits value={value} /> <span className="text-base font-semibold text-white/80">{units}</span>
          </span>
        </span>
        <Pencil className="size-4 opacity-60 transition group-hover:opacity-100" />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t("updateOdometer")}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="flex flex-col gap-4"
        >
          <div className="relative">
            <Input
              autoFocus
              inputMode="numeric"
              value={input}
              onChange={(e) => {
                setInput(e.target.value.replace(/[^\d\s]/g, ""));
                setConfirmLower(false);
              }}
              placeholder={String(value + Math.round(perDay * 7))}
              className="h-16 pr-14 font-display text-3xl font-bold tabular"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-muted">{units}</span>
          </div>
          <p className="text-sm text-muted">{t("perDay", { value: Math.round(perDay), units })}</p>
          {confirmLower ? (
            <div className="rounded-2xl bg-warning/10 p-4">
              <p className="mb-3 text-sm text-warning">{t("odometerLower")}</p>
              <Button type="button" variant="dark" loading={busy} onClick={() => save(true)}>
                {tc("save")}
              </Button>
            </div>
          ) : (
            <Button type="submit" size="lg" loading={busy}>
              {tc("save")}
            </Button>
          )}
        </form>
      </Sheet>
    </>
  );
}
