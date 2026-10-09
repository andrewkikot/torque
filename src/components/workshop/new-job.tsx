"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { KeyRound, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { checkInAction, walkInAction } from "@/app/actions/workshop";
import { toastActionError } from "@/lib/action-toast";

/** Type the customer's TQ-code when scanning isn't possible. */
export function CodeEntry() {
  const t = useTranslations("workshop");
  const router = useRouter();
  const [code, setCode] = useState("");
  const clean = code.toUpperCase().replace(/^TQ[-\s]?/, "").replace(/[^0-9A-Z]/g, "");
  return (
    <Card>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (clean.length === 6) router.push(`/w/checkin/${clean}`);
        }}
      >
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
            <KeyRound className="size-5" />
          </span>
          <div>
            <h2 className="font-bold">{t("enterCode")}</h2>
            <p className="text-sm text-muted">{t("enterCodeSub")}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Input
            id="checkin-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="TQ-7K4MQ2"
            autoCapitalize="characters"
            autoComplete="off"
            className="font-mono text-lg tracking-widest uppercase"
          />
          <Button type="submit" disabled={clean.length !== 6}>
            {t("continue")}
          </Button>
        </div>
      </form>
    </Card>
  );
}

/** Customer without Torque: vehicle + contact; they get a tracking link. */
export function WalkInForm() {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ vehicleMake: "", vehicleModel: "", vehiclePlate: "", customerName: "", customerPhone: "", title: "", eta: "" });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof v, val: string) => setV((p) => ({ ...p, [k]: val }));

  return (
    <Card>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 text-left">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
          <UserPlus className="size-5" />
        </span>
        <div>
          <h2 className="font-bold">{t("workshop.walkInTitle")}</h2>
          <p className="text-sm text-muted">{t("workshop.walkInSub")}</p>
        </div>
      </button>
      {open && (
        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const r = await walkInAction({ ...v, eta: v.eta ? new Date(v.eta).toISOString() : null });
            setBusy(false);
            if (!r.ok) return toastActionError(r, t("plan.upgrade"));
            router.push(`/w/jobs/${r.data.id}`);
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("wizard.make")}>
              <Input id="wi-make" value={v.vehicleMake} onChange={(e) => set("vehicleMake", e.target.value)} placeholder={t("wizard.makePlaceholder")} required />
            </Field>
            <Field label={t("wizard.model")}>
              <Input id="wi-model" value={v.vehicleModel} onChange={(e) => set("vehicleModel", e.target.value)} placeholder={t("wizard.modelPlaceholder")} />
            </Field>
          </div>
          <Field label={t("wizard.plate")}>
            <Input id="wi-plate" value={v.vehiclePlate} onChange={(e) => set("vehiclePlate", e.target.value.toUpperCase())} placeholder="AA 1234 BB" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("workshop.customerName")}>
              <Input id="wi-name" value={v.customerName} onChange={(e) => set("customerName", e.target.value)} />
            </Field>
            <Field label={t("workshop.customerPhone")}>
              <Input id="wi-phone" type="tel" value={v.customerPhone} onChange={(e) => set("customerPhone", e.target.value)} placeholder="+380…" />
            </Field>
          </div>
          <Field label={t("visit.what")}>
            <Input id="wi-title" value={v.title} onChange={(e) => set("title", e.target.value)} placeholder={t("visit.whatPlaceholder")} required />
          </Field>
          <Field label={t("visit.eta")} optional={t("common.optional")}>
            <Input id="wi-eta" type="datetime-local" value={v.eta} onChange={(e) => set("eta", e.target.value)} />
          </Field>
          <Button type="submit" size="lg" loading={busy}>
            {t("workshop.createJob")}
          </Button>
        </form>
      )}
    </Card>
  );
}

/** Confirm a check-in after scanning the owner's QR. */
export function CheckInForm({ code, odometer }: { code: string; odometer: number }) {
  const t = useTranslations();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [eta, setEta] = useState("");
  const [odo, setOdo] = useState(String(odometer || ""));
  const [busy, setBusy] = useState(false);
  return (
    <Card>
      <form
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const r = await checkInAction(code, { title, eta: eta ? new Date(eta).toISOString() : null, odometer: odo ? Number(odo.replace(/\D/g, "")) : null });
          setBusy(false);
          if (!r.ok) return toastActionError(r, t("plan.upgrade"));
          router.replace(`/w/jobs/${r.data.id}`);
        }}
      >
        <Field label={t("visit.what")}>
          <Input id="ci-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("visit.whatPlaceholder")} required autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("visit.odometer")}>
            <Input id="ci-odo" inputMode="numeric" value={odo} onChange={(e) => setOdo(e.target.value)} />
          </Field>
          <Field label={t("visit.eta")} optional={t("common.optional")}>
            <Input id="ci-eta" type="datetime-local" value={eta} onChange={(e) => setEta(e.target.value)} />
          </Field>
        </div>
        <Button type="submit" size="lg" loading={busy}>
          {t("workshop.checkInButton")}
        </Button>
      </form>
    </Card>
  );
}
