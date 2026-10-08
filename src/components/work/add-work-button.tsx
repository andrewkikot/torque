"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { WorkForm } from "./work-form";
import { addWorkAction } from "@/app/actions/work";

export function AddWorkButton({
  carId,
  currency,
  units,
  odometer,
  plans,
  variant = "primary",
  className,
  compact,
}: {
  carId: string;
  currency: string;
  units: string;
  odometer: number;
  plans: { id: string; name: string }[];
  variant?: "primary" | "outline" | "secondary";
  className?: string;
  /** Square tile for the phone quick-actions row. */
  compact?: boolean;
}) {
  const t = useTranslations("car");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      {compact ? (
        <button
          onClick={() => setOpen(true)}
          className="flex flex-col items-center justify-center gap-1.5 rounded-3xl bg-accent px-2 py-3 text-center text-xs font-semibold text-accent-fg shadow-card active:scale-[0.97]"
        >
          <span className="grid size-10 place-items-center rounded-2xl bg-white/20">
            <Plus className="size-5" />
          </span>
          <span className="line-clamp-2 leading-tight">{t("logWork")}</span>
        </button>
      ) : (
        <Button variant={variant} onClick={() => setOpen(true)} className={className}>
          <Plus /> {t("logWork")}
        </Button>
      )}
      <Sheet open={open} onClose={() => setOpen(false)} title={t("logWork")}>
        <WorkForm
          currency={currency}
          units={units}
          defaultOdometer={odometer}
          plans={plans}
          onSubmit={async (p) => {
            const r = await addWorkAction({ carId, ...p });
            return r.ok ? { ok: true } : r;
          }}
          onDone={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </Sheet>
    </>
  );
}
