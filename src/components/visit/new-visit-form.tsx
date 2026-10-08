"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Switch } from "@/components/ui/field";
import { createVisitAction } from "@/app/actions/visits";
import { accentStyle, cn } from "@/lib/utils";

export function NewVisitForm({
  cars,
  defaultCarId,
  units,
}: {
  cars: { id: string; name: string; color: string; odometer: number }[];
  defaultCarId: string;
  units: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [carId, setCarId] = useState(cars.some((c) => c.id === defaultCarId) ? defaultCarId : cars[0].id);
  const car = cars.find((c) => c.id === carId)!;
  const [title, setTitle] = useState("");
  const [shopName, setShopName] = useState("");
  const [shopContact, setShopContact] = useState("");
  const [plannedAt, setPlannedAt] = useState("");
  const [eta, setEta] = useState("");
  const [odometer, setOdometer] = useState(String(car.odometer));
  const [already, setAlready] = useState(true);
  const [busy, setBusy] = useState(false);

  return (
    <form
      style={accentStyle(car.color)}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const r = await createVisitAction({
          carId,
          title,
          shopName: shopName || null,
          shopContact: shopContact || null,
          plannedAt: plannedAt ? new Date(plannedAt).toISOString() : null,
          eta: eta ? new Date(eta).toISOString() : null,
          odometer: odometer ? Number(odometer.replace(/\D/g, "")) : null,
          status: already ? "dropped_off" : "planned",
        });
        setBusy(false);
        if (!r.ok) return toast.error(r.error);
        router.push(`/visits/${r.data.id}`);
      }}
    >
      <Card className="flex flex-col gap-4 p-6">
        {cars.length > 1 && (
          <div>
            <span className="mb-1.5 block text-sm font-semibold">{t("visit.car")}</span>
            <div className="flex flex-wrap gap-2">
              {cars.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setCarId(c.id);
                    setOdometer(String(c.odometer));
                  }}
                  className={cn("flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold", c.id === carId ? "border-accent bg-accent-soft" : "border-border")}
                >
                  <span className="size-3 rounded-full" style={{ background: c.color }} />
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}
        <Field label={t("visit.what")}>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("visit.whatPlaceholder")} required autoFocus />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("visit.shop")} optional={t("common.optional")}>
            <Input value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder={t("visit.shopPlaceholder")} />
          </Field>
          <Field label={t("visit.shopContact")} optional={t("common.optional")}>
            <Input value={shopContact} onChange={(e) => setShopContact(e.target.value)} placeholder={t("visit.shopContactPlaceholder")} />
          </Field>
        </div>
        <Switch checked={already} onChange={setAlready} label={t("visit.alreadyThere")} />
        <div className="grid gap-4 sm:grid-cols-2">
          {!already && (
            <Field label={t("visit.plannedAt")}>
              <Input type="datetime-local" value={plannedAt} onChange={(e) => setPlannedAt(e.target.value)} />
            </Field>
          )}
          <Field label={t("visit.eta")} optional={t("common.optional")}>
            <Input type="datetime-local" value={eta} onChange={(e) => setEta(e.target.value)} />
          </Field>
          <Field label={`${t("visit.odometer")} (${units})`}>
            <Input inputMode="numeric" value={odometer} onChange={(e) => setOdometer(e.target.value)} />
          </Field>
        </div>
        <Button type="submit" size="lg" loading={busy} className="mt-2">
          {t("visit.create")}
        </Button>
      </Card>
    </form>
  );
}
