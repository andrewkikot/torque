"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { StatusControls } from "./status-controls";
import { Composer } from "./composer";
import { WorkPanel } from "./work-panel";
import { ConfirmButton } from "@/components/ui/confirm";
import { changeStatusAction, addNoteAction, addVisitWorkAction, removeVisitWorkAction, deleteVisitAction } from "@/app/actions/visits";
import type { VisitStatusValue } from "@/lib/domain/visit-status";
import type { VisitWork } from "./types";

const ok = (r: { ok: boolean; error?: string }) => (r.ok ? ({ ok: true } as const) : ({ ok: false, error: r.error ?? "Error" } as const));

export function OwnerStatusControls({ visitId, status }: { visitId: string; status: VisitStatusValue }) {
  return <StatusControls status={status} onChange={async (to, msg) => ok(await changeStatusAction(visitId, to, msg))} />;
}

export function OwnerComposer({ visitId }: { visitId: string }) {
  return <Composer onPost={async (m, p) => ok(await addNoteAction(visitId, m, p))} />;
}

export function OwnerWorkPanel({ visitId, items, currency, units, closed }: { visitId: string; items: VisitWork[]; currency: string; units: string; closed: boolean }) {
  return (
    <WorkPanel
      items={items}
      currency={currency}
      units={units}
      closed={closed}
      onAdd={async (p) => ok(await addVisitWorkAction(visitId, p))}
      onRemove={async (id) => ok(await removeVisitWorkAction(visitId, id))}
    />
  );
}

export function DeleteVisitButton({ visitId }: { visitId: string }) {
  const t = useTranslations("visit");
  const router = useRouter();
  return (
    <ConfirmButton
      size="sm"
      confirmLabel={t("deleteVisit")}
      onConfirm={async () => {
        const r = await deleteVisitAction(visitId);
        if (!r.ok) return toast.error(r.error);
        router.push("/visits");
      }}
    >
      <Trash2 /> {t("deleteVisit")}
    </ConfirmButton>
  );
}
