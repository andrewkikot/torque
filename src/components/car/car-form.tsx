"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Switch } from "@/components/ui/field";
import { Card } from "@/components/ui/card";
import { usePhotoUpload } from "@/components/photo-upload";
import { CarPhoto } from "./car-photo";
import { createCarAction, updateCarAction } from "@/app/actions/cars";
import { fireConfetti } from "@/components/confetti";
import { CAR_COLORS, accentStyle, cn } from "@/lib/utils";

const FUELS = ["petrol", "diesel", "hybrid", "electric", "lpg", "other"] as const;
const TRANSMISSIONS = ["manual", "automatic", "cvt", "dct", "other"] as const;

export type CarFormValues = {
  make: string;
  model: string;
  year: string;
  currentOdometer: string;
  fuel: (typeof FUELS)[number];
  transmission: string;
  vin: string;
  plate: string;
  engine: string;
  purchaseDate: string;
  nickname: string;
  accentColor: string;
  photoUrl: string | null;
};

const empty: CarFormValues = {
  make: "",
  model: "",
  year: "",
  currentOdometer: "",
  fuel: "petrol",
  transmission: "",
  vin: "",
  plate: "",
  engine: "",
  purchaseDate: "",
  nickname: "",
  accentColor: CAR_COLORS[0],
  photoUrl: null,
};

export function CarForm({ carId, initial, units }: { carId?: string; initial?: Partial<CarFormValues>; units: string }) {
  const t = useTranslations();
  const router = useRouter();
  const isEdit = !!carId;
  const [v, setV] = useState<CarFormValues>({ ...empty, ...initial });
  const [step, setStep] = useState(0);
  const [presets, setPresets] = useState(true);
  const [saving, setSaving] = useState(false);
  const { uploading, uploadFile } = usePhotoUpload({ folder: "cars" });
  const set = <K extends keyof CarFormValues>(k: K, val: CarFormValues[K]) => setV((p) => ({ ...p, [k]: val }));

  const steps = [t("wizard.step1"), t("wizard.step2"), t("wizard.step3")];
  const basicsValid = v.make.trim() && v.model.trim();

  function payload() {
    return {
      make: v.make,
      model: v.model,
      year: v.year ? Number(v.year) : null,
      currentOdometer: v.currentOdometer ? Number(v.currentOdometer.replace(/\s/g, "")) : 0,
      fuel: v.fuel,
      transmission: v.transmission || null,
      vin: v.vin || null,
      plate: v.plate || null,
      engine: v.engine || null,
      purchaseDate: v.purchaseDate || null,
      nickname: v.nickname || null,
      accentColor: v.accentColor,
      photoUrl: v.photoUrl,
    };
  }

  async function submit() {
    setSaving(true);
    if (isEdit) {
      // Mileage is changed through the odometer widget so it gets a reading entry.
      const data: Partial<ReturnType<typeof payload>> = payload();
      delete data.currentOdometer;
      const r = await updateCarAction(carId, data);
      setSaving(false);
      if (!r.ok) return toast.error(r.error);
      toast.success(t("settings.saved"));
      router.push(`/cars/${carId}`);
      router.refresh();
      return;
    }
    const r = await createCarAction(payload(), presets);
    setSaving(false);
    if (!r.ok) return toast.error(r.error);
    fireConfetti(v.accentColor);
    toast.success(t("wizard.created", { name: r.data.name }));
    router.push(`/cars/${r.data.id}`);
  }

  const basics = (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={t("wizard.make")}>
        <Input value={v.make} onChange={(e) => set("make", e.target.value)} placeholder={t("wizard.makePlaceholder")} autoFocus={!isEdit} required />
      </Field>
      <Field label={t("wizard.model")}>
        <Input value={v.model} onChange={(e) => set("model", e.target.value)} placeholder={t("wizard.modelPlaceholder")} required />
      </Field>
      <Field label={t("wizard.year")} optional={t("common.optional")}>
        <Input inputMode="numeric" value={v.year} onChange={(e) => set("year", e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="2019" />
      </Field>
      {!isEdit && (
        <Field label={`${t("wizard.odometer")} (${units})`}>
          <Input inputMode="numeric" value={v.currentOdometer} onChange={(e) => set("currentOdometer", e.target.value.replace(/[^\d\s]/g, ""))} placeholder="84 500" />
        </Field>
      )}
      <div className="sm:col-span-2">
        <span className="mb-1.5 block text-sm font-semibold">{t("wizard.fuel")}</span>
        <div className="flex flex-wrap gap-2">
          {FUELS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => set("fuel", f)}
              className={cn(
                "rounded-2xl border px-4 py-2 text-sm font-semibold transition",
                v.fuel === f ? "border-accent bg-accent text-accent-fg" : "border-border bg-card hover:bg-soft",
              )}
            >
              {t(`fuel.${f}`)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const details = (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={t("wizard.plate")} optional={t("common.optional")}>
        <Input value={v.plate} onChange={(e) => set("plate", e.target.value.toUpperCase())} placeholder="AA 1234 BB" />
      </Field>
      <Field label={t("wizard.vin")} optional={t("common.optional")}>
        <Input value={v.vin} onChange={(e) => set("vin", e.target.value.toUpperCase().slice(0, 17))} className="font-mono" placeholder="WVWZZZ1KZ…" />
      </Field>
      <Field label={t("wizard.engine")} optional={t("common.optional")}>
        <Input value={v.engine} onChange={(e) => set("engine", e.target.value)} placeholder={t("wizard.enginePlaceholder")} />
      </Field>
      <Field label={t("wizard.transmission")} optional={t("common.optional")}>
        <Select value={v.transmission} onChange={(e) => set("transmission", e.target.value)}>
          <option value="">—</option>
          {TRANSMISSIONS.map((x) => (
            <option key={x} value={x}>
              {t(`transmission.${x}`)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("wizard.purchaseDate")} optional={t("common.optional")}>
        <Input type="date" value={v.purchaseDate} onChange={(e) => set("purchaseDate", e.target.value)} />
      </Field>
    </div>
  );

  const personalize = (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_260px]">
      <div className="flex flex-col gap-5">
        <Field label={t("wizard.nickname")} optional={t("common.optional")}>
          <Input value={v.nickname} onChange={(e) => set("nickname", e.target.value)} placeholder={t("wizard.nicknamePlaceholder")} maxLength={40} />
        </Field>
        <div>
          <span className="mb-2 block text-sm font-semibold">{t("wizard.color")}</span>
          <div className="flex flex-wrap gap-2.5">
            {CAR_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => set("accentColor", c)}
                className={cn("grid size-10 place-items-center rounded-full ring-offset-2 ring-offset-bg transition hover:scale-110", v.accentColor === c && "ring-2 ring-fg")}
                style={{ background: c }}
                aria-label={c}
              >
                {v.accentColor === c && <Check className="size-4 text-white mix-blend-difference" />}
              </button>
            ))}
            <label className="relative grid size-10 cursor-pointer place-items-center overflow-hidden rounded-full border border-dashed border-border text-xs text-muted" title="Custom">
              +
              <input type="color" value={v.accentColor} onChange={(e) => set("accentColor", e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
            </label>
          </div>
        </div>
        <div>
          <span className="mb-2 block text-sm font-semibold">{t("wizard.photo")}</span>
          <div className="flex flex-wrap gap-2">
            <label className={cn("inline-flex h-10 cursor-pointer items-center gap-2 rounded-2xl bg-soft px-4 text-sm font-semibold hover:bg-border", uploading && "opacity-60")}>
              {uploading ? t("wizard.uploading") : v.photoUrl ? t("wizard.changePhoto") : t("wizard.uploadPhoto")}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) {
                    const url = await uploadFile(f);
                    if (url) set("photoUrl", url);
                  }
                }}
              />
            </label>
            {v.photoUrl && (
              <Button type="button" variant="ghost" size="md" onClick={() => set("photoUrl", null)}>
                <Trash2 /> {t("wizard.removePhoto")}
              </Button>
            )}
          </div>
        </div>
        {!isEdit && <Switch checked={presets} onChange={setPresets} label={t("wizard.presets")} />}
      </div>
      {/* Live preview card */}
      <div style={accentStyle(v.accentColor)} className="overflow-hidden rounded-4xl border border-border bg-card shadow-card">
        <CarPhoto car={{ ...v, make: v.make || "Car" }} className="h-36 w-full" rounded="rounded-none" />
        <div className="p-4">
          <div className="truncate font-display text-lg font-bold">{v.nickname || `${v.make} ${v.model}`.trim() || "—"}</div>
          <div className="truncate text-sm text-muted">{[v.year, v.make, v.model].filter(Boolean).join(" ")}</div>
          <div className="mt-3 h-2 rounded-full bg-accent" />
        </div>
      </div>
    </div>
  );

  if (isEdit) {
    return (
      <div style={accentStyle(v.accentColor)} className="flex flex-col gap-5">
        <Card>{basics}</Card>
        <Card>{details}</Card>
        <Card>{personalize}</Card>
        <div className="sticky bottom-24 z-10 flex justify-end lg:bottom-6">
          <Button size="lg" onClick={submit} loading={saving} disabled={!basicsValid || uploading} className="shadow-xl">
            {t("common.save")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={accentStyle(v.accentColor)}>
      <ol className="mb-6 flex gap-2">
        {steps.map((s, i) => (
          <li key={s} className="flex-1">
            <div className={cn("h-1.5 rounded-full transition-colors", i <= step ? "bg-accent" : "bg-border")} />
            <span className={cn("mt-2 block text-xs font-semibold", i === step ? "text-fg" : "text-muted")}>{s}</span>
          </li>
        ))}
      </ol>
      <Card className="overflow-hidden p-6">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.18 }}>
            {step === 0 ? basics : step === 1 ? details : personalize}
          </motion.div>
        </AnimatePresence>
      </Card>
      <div className="mt-6 flex justify-between gap-3">
        <Button variant="ghost" onClick={() => (step === 0 ? router.back() : setStep(step - 1))}>
          {step === 0 ? t("common.cancel") : t("common.back")}
        </Button>
        {step < 2 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!basicsValid}>
            {t("common.next")} →
          </Button>
        ) : (
          <Button onClick={submit} loading={saving} disabled={!basicsValid || uploading} size="lg">
            {t("wizard.create")}
          </Button>
        )}
      </div>
    </div>
  );
}
