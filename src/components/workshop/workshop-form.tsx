"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { PhotoButton } from "@/components/photo-upload";
import { createWorkshopAction, updateWorkshopAction } from "@/app/actions/workshop";
import { CAR_COLORS, cn } from "@/lib/utils";

type Values = {
  name: string;
  city: string;
  address: string;
  phone: string;
  accentColor: string;
  logoUrl: string | null;
  description: string;
  hours: string;
  website: string;
  telegram: string;
};

const EMPTY: Values = { name: "", city: "", address: "", phone: "", accentColor: "#0ea5e9", logoUrl: null, description: "", hours: "", website: "", telegram: "" };

export function WorkshopForm({ mode, initial }: { mode: "create" | "edit"; initial?: Values }) {
  const t = useTranslations();
  const router = useRouter();
  const [v, setV] = useState<Values>({ ...EMPTY, ...initial });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Values, val: string | null) => setV((p) => ({ ...p, [k]: val }));

  return (
    <Card>
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const r = mode === "create" ? await createWorkshopAction(v) : await updateWorkshopAction(v);
          setBusy(false);
          if (!r.ok) return toast.error(r.error);
          toast.success(t("settings.saved"));
          if (mode === "create") router.replace("/w");
          else router.refresh();
        }}
      >
        <div className="flex items-center gap-4">
          <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl text-2xl text-white" style={{ background: v.accentColor }}>
            {v.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={v.logoUrl} alt="" className="size-full object-cover" />
            ) : (
              "🔧"
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <PhotoButton folder="workshops" label={v.logoUrl ? t("workshop.changeLogo") : t("workshop.uploadLogo")} onUploaded={(url) => set("logoUrl", url)} />
            {v.logoUrl && (
              <Button type="button" variant="ghost" size="sm" onClick={() => set("logoUrl", null)}>
                {t("wizard.removePhoto")}
              </Button>
            )}
          </div>
        </div>
        <Field label={t("workshop.name")}>
          <Input id="ws-name" value={v.name} onChange={(e) => set("name", e.target.value)} placeholder="AutoMaster Kyiv" required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("workshop.city")} optional={t("common.optional")}>
            <Input id="ws-city" value={v.city} onChange={(e) => set("city", e.target.value)} />
          </Field>
          <Field label={t("workshop.phone")} optional={t("common.optional")}>
            <Input id="ws-phone" type="tel" value={v.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+380…" />
          </Field>
        </div>
        <Field label={t("workshop.address")} optional={t("common.optional")}>
          <Input id="ws-address" value={v.address} onChange={(e) => set("address", e.target.value)} />
        </Field>
        <Field label={t("workshop.description")} optional={t("common.optional")} hint={t("workshop.descriptionHint")}>
          <Textarea id="ws-description" value={v.description} onChange={(e) => set("description", e.target.value)} rows={3} maxLength={500} />
        </Field>
        <Field label={t("workshop.hours")} optional={t("common.optional")}>
          <Input id="ws-hours" value={v.hours} onChange={(e) => set("hours", e.target.value)} placeholder={t("workshop.hoursPlaceholder")} />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t("workshop.website")} optional={t("common.optional")}>
            <Input id="ws-website" inputMode="url" value={v.website} onChange={(e) => set("website", e.target.value)} placeholder="automaster.ua" />
          </Field>
          <Field label="Telegram" optional={t("common.optional")}>
            <Input id="ws-telegram" value={v.telegram} onChange={(e) => set("telegram", e.target.value)} placeholder="@automaster_kyiv" />
          </Field>
        </div>
        <div>
          <span className="mb-2 block text-sm font-semibold">{t("wizard.color")}</span>
          <div className="flex flex-wrap gap-2">
            {CAR_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => set("accentColor", c)}
                className={cn("grid size-9 place-items-center rounded-full ring-offset-2 ring-offset-bg", v.accentColor === c && "ring-2 ring-fg")}
                style={{ background: c }}
                aria-label={c}
              >
                {v.accentColor === c && <Check className="size-4 text-white mix-blend-difference" />}
              </button>
            ))}
          </div>
        </div>
        <Button type="submit" size="lg" loading={busy}>
          {mode === "create" ? t("workshop.createButton") : t("common.save")}
        </Button>
      </form>
    </Card>
  );
}
