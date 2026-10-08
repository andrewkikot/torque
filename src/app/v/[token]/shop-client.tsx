"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Hand, Plus, X } from "lucide-react";
import { StatusControls } from "@/components/visit/status-controls";
import { Composer } from "@/components/visit/composer";
import { WorkPanel } from "@/components/visit/work-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet } from "@/components/ui/sheet";
import { Field, Input, Textarea } from "@/components/ui/field";
import { shopStatusAction, shopNoteAction, shopWorkAction, shopApprovalAction } from "@/app/actions/shop";
import { SHOP_STATUSES, type VisitStatusValue } from "@/lib/domain/visit-status";
import type { VisitWork } from "@/components/visit/types";

const ok = (r: { ok: boolean; error?: string }) => (r.ok ? ({ ok: true } as const) : ({ ok: false, error: r.error ?? "Error" } as const));

export function ShopControls({ token, status, items, currency }: { token: string; status: VisitStatusValue; items: VisitWork[]; currency: string }) {
  const t = useTranslations();
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex flex-col gap-4">
        <Card>
          <h3 className="mb-3 font-display font-semibold">{t("shop.updateStatus")}</h3>
          <StatusControls
            status={status}
            allowed={SHOP_STATUSES}
            successMessage={t("shop.statusUpdated")}
            onChange={async (to, msg) => ok(await shopStatusAction(token, to, msg))}
          />
        </Card>
        <Composer
          shareToken={token}
          onPost={async (m, p) => {
            const r = ok(await shopNoteAction(token, m, p));
            if (r.ok) toast.success(t("shop.noteSent"));
            return r;
          }}
        />
        <ApprovalRequest token={token} currency={currency} />
      </div>
      <WorkPanel
        items={items}
        currency={currency}
        units="km"
        closed={false}
        shareToken={token}
        addLabel={t("shop.addWork")}
        onAdd={async (p) => ok(await shopWorkAction(token, p))}
      />
    </div>
  );
}

function ApprovalRequest({ token, currency }: { token: string; currency: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [rows, setRows] = useState([{ name: "", cost: "" }]);
  const [busy, setBusy] = useState(false);
  const valid = rows.some((r) => r.name.trim());

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="self-start">
        <Hand /> {t("shop.requestApproval")}
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t("shop.requestApproval")}>
        <div className="flex flex-col gap-4">
          <Field label={t("shop.approvalMessage")}>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t("shop.approvalPlaceholder")} rows={3} />
          </Field>
          <div>
            <span className="mb-1.5 block text-sm font-semibold">{t("shop.items")}</span>
            <div className="flex flex-col gap-2">
              {rows.map((r, i) => (
                <div key={i} className="grid grid-cols-[minmax(0,1fr)_110px_auto] gap-2">
                  <Input
                    value={r.name}
                    placeholder={t("work.namePlaceholder")}
                    onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                  />
                  <Input
                    inputMode="decimal"
                    value={r.cost}
                    placeholder={currency}
                    onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, cost: e.target.value.replace(/[^\d.,]/g, "") } : x)))}
                  />
                  <Button variant="ghost" size="icon" type="button" disabled={rows.length === 1} onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label="Remove">
                    <X />
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setRows([...rows, { name: "", cost: "" }])}>
              <Plus /> {t("shop.addItem")}
            </Button>
          </div>
          <Button
            size="lg"
            loading={busy}
            disabled={!valid}
            onClick={async () => {
              setBusy(true);
              const r = await shopApprovalAction(
                token,
                message,
                rows.filter((x) => x.name.trim()).map((x) => ({ name: x.name, cost: Number(x.cost.replace(",", ".")) || 0, type: "part" })),
              );
              setBusy(false);
              if (!r.ok) return toast.error(r.error);
              toast.success(t("shop.requestSent"));
              setOpen(false);
              setMessage("");
              setRows([{ name: "", cost: "" }]);
              router.refresh();
            }}
          >
            {t("shop.sendRequest")}
          </Button>
        </div>
      </Sheet>
    </>
  );
}
