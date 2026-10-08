"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { PlanForm } from "./plan-form";
import { addPlanAction, addPresetPlansAction } from "@/app/actions/work";

export function AddPlanButton({ carId, units, odometer }: { carId: string; units: string; odometer: number }) {
  const t = useTranslations("maintenance");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus /> {t("add")}
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t("add")}>
        <PlanForm
          units={units}
          initial={{ lastDoneOdometer: String(odometer) }}
          onSubmit={async (v) => {
            const r = await addPlanAction({ carId, ...v });
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

export function AddPresetsButton({ carId }: { carId: string }) {
  const t = useTranslations("maintenance");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outline"
      loading={busy}
      onClick={async () => {
        setBusy(true);
        const r = await addPresetPlansAction(carId);
        setBusy(false);
        if (!r.ok) return toast.error(r.error);
        router.refresh();
      }}
    >
      <Sparkles /> {t("addPresets")}
    </Button>
  );
}
