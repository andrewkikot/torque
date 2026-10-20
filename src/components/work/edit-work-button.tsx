"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { WorkForm, type WorkPayload } from "./work-form";
import { updateWorkAction } from "@/app/actions/work";

export type EditableWork = Partial<WorkPayload> & { id: string; currency: string };

/** Pencil on a service-book entry the owner wrote. Shop records aren't editable here. */
export function EditWorkButton({
  carId,
  item,
  units,
  plans,
}: {
  carId: string;
  item: EditableWork;
  units: string;
  plans?: { id: string; name: string }[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="size-8 px-0 text-muted opacity-0 transition group-hover:opacity-100 focus:opacity-100 max-lg:opacity-100"
        onClick={() => setOpen(true)}
        aria-label={t("common.edit")}
      >
        <Pencil />
      </Button>
      {/* The sheet mounts its children only while open, so the form re-reads `initial` each time. */}
      <Sheet open={open} onClose={() => setOpen(false)} title={t("work.editTitle")}>
        <WorkForm
          currency={item.currency}
          units={units}
          plans={plans}
          initial={item}
          successLabel={t("work.updated")}
          onSubmit={async (p) => {
            const r = await updateWorkAction(carId, item.id, p);
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
