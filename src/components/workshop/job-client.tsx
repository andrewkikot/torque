"use client";

import { useTranslations } from "next-intl";
import { StatusControls } from "@/components/visit/status-controls";
import { Composer } from "@/components/visit/composer";
import { WorkPanel } from "@/components/visit/work-panel";
import { jobStatusAction, jobNoteAction, jobWorkAction, jobRemoveWorkAction } from "@/app/actions/workshop";
import type { VisitStatusValue } from "@/lib/domain/visit-status";
import type { VisitWork } from "@/components/visit/types";
import { toastActionError } from "@/lib/action-toast";

const ok = (r: { ok: boolean; error?: string; code?: string }) => {
  if (!r.ok && r.code === "limit") toastActionError({ error: r.error ?? "", code: r.code });
  return r.ok ? ({ ok: true } as const) : ({ ok: false, error: r.code === "limit" ? "" : (r.error ?? "Error") } as const);
};

export function JobStatus({ visitId, status }: { visitId: string; status: VisitStatusValue }) {
  const t = useTranslations("shop");
  return <StatusControls status={status} successMessage={t("statusUpdated")} onChange={async (to, msg) => ok(await jobStatusAction(visitId, to, msg))} />;
}

export function JobComposer({ visitId }: { visitId: string }) {
  const t = useTranslations("shop");
  return <Composer placeholder={t("notePlaceholder")} onPost={async (m, p) => ok(await jobNoteAction(visitId, m, p))} />;
}

export function JobWork({ visitId, items, currency, closed }: { visitId: string; items: VisitWork[]; currency: string; closed: boolean }) {
  const t = useTranslations("shop");
  return (
    <WorkPanel
      items={items}
      currency={currency}
      units="km"
      closed={closed}
      addLabel={t("addWork")}
      onAdd={async (p) => ok(await jobWorkAction(visitId, p))}
      onRemove={async (id) => ok(await jobRemoveWorkAction(visitId, id))}
    />
  );
}
