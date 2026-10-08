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
}: {
  carId: string;
  currency: string;
  units: string;
  odometer: number;
  plans: { id: string; name: string }[];
  variant?: "primary" | "outline" | "secondary";
  className?: string;
}) {
  const t = useTranslations("car");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)} className={className}>
        <Plus /> {t("logWork")}
      </Button>
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
