"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Copy, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { generateLicensesAction } from "@/app/actions/admin";

/** Issue Pro keys. They are shown once; only hashes are stored. */
export function GenerateForm() {
  const t = useTranslations("admin");
  const router = useRouter();
  const [v, setV] = useState({ seats: "5", months: "12", quantity: "1", note: "" });
  const [keys, setKeys] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof v, val: string) => setV((p) => ({ ...p, [k]: val }));
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(keys!.join("\n"));
      toast.success(t("copied"));
    } catch {
      toast(keys!.join("\n"));
    }
  };

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="font-display text-lg font-semibold">{t("generateTitle")}</h2>
      <form
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const r = await generateLicensesAction({ seats: Number(v.seats), months: Number(v.months), quantity: Number(v.quantity), note: v.note });
          setBusy(false);
          if (!r.ok) return toast.error(r.error);
          setKeys(r.data.keys);
          router.refresh();
        }}
      >
        <Field label={t("months")}>
          <Input id="gen-months" inputMode="numeric" value={v.months} onChange={(e) => set("months", e.target.value)} />
        </Field>
        <Field label={t("seats")}>
          <Input id="gen-seats" inputMode="numeric" value={v.seats} onChange={(e) => set("seats", e.target.value)} />
        </Field>
        <Field label={t("quantity")}>
          <Input id="gen-qty" inputMode="numeric" value={v.quantity} onChange={(e) => set("quantity", e.target.value)} />
        </Field>
        <Field label={t("note")} className="col-span-2 sm:col-span-1">
          <Input id="gen-note" value={v.note} onChange={(e) => set("note", e.target.value)} placeholder={t("notePlaceholder")} />
        </Field>
        <Button type="submit" loading={busy} className="col-span-2 sm:col-span-4 sm:justify-self-start">
          <KeyRound /> {t("generate")}
        </Button>
      </form>
      {keys && (
        <div className="rounded-2xl border-2 border-dashed border-accent/50 bg-accent-soft p-4">
          <div className="mb-2 text-sm font-bold">{t("keysOnce")}</div>
          <pre className="select-all overflow-x-auto whitespace-pre font-mono text-sm leading-7">{keys.join("\n")}</pre>
          <Button size="sm" variant="dark" className="mt-3" onClick={copy}>
            <Copy /> {t("copyAll")}
          </Button>
        </div>
      )}
    </Card>
  );
}
