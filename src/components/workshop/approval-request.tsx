"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Hand, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Field, Input, Textarea } from "@/components/ui/field";
import { jobApprovalAction } from "@/app/actions/workshop";

/** Workshop asks the customer to approve extra work (items + reason). */
export function ApprovalRequest({ visitId, currency }: { visitId: string; currency: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [rows, setRows] = useState([{ name: "", cost: "" }]);
  const [busy, setBusy] = useState(false);
  const valid = rows.some((r) => r.name.trim());

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="w-full sm:w-auto">
        <Hand /> {t("shop.requestApproval")}
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t("shop.requestApproval")}>
        <div className="flex flex-col gap-4">
          <Field label={t("shop.approvalMessage")}>
            <Textarea id="approval-message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t("shop.approvalPlaceholder")} rows={3} />
          </Field>
          <div>
            <span className="mb-1.5 block text-sm font-semibold">{t("shop.items")}</span>
            <div className="flex flex-col gap-2">
              {rows.map((r, i) => (
                <div key={i} className="grid grid-cols-[1fr_110px_auto] gap-2">
                  <Input value={r.name} placeholder={t("work.namePlaceholder")} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
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
              const r = await jobApprovalAction(
                visitId,
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
