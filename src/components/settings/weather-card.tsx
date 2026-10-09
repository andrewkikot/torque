"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { CloudSun, LocateFixed, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, Switch } from "@/components/ui/field";
import { setLocationAction, clearLocationAction } from "@/app/actions/tyres";
import { updatePrefsAction } from "@/app/actions/settings";
import { UA_REGIONS } from "@/lib/domain/tyres";

/** Region for weather-based tyre reminders: a regional centre or the device location. */
export function WeatherCard({ place, notifyTyres }: { place: string | null; notifyTyres: boolean }) {
  const t = useTranslations("tyres");
  const locale = useLocale();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notify, setNotify] = useState(notifyTyres);

  const save = async (lat: number, lon: number, name: string) => {
    setBusy(true);
    const r = await setLocationAction({ lat, lon, place: name });
    setBusy(false);
    if (!r.ok) return toast.error(r.error);
    toast.success(t("locationSaved"));
    router.refresh();
  };

  return (
    <Card id="weather" className="flex scroll-mt-6 flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-xl bg-sky-500 text-white">
          <CloudSun className="size-4" />
        </span>
        <h2 className="font-display text-lg font-semibold">{t("settingsTitle")}</h2>
      </div>
      <p className="text-sm text-muted">{t("settingsSub")}</p>
      {place && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-soft px-4 py-3">
          <span className="flex items-center gap-2 font-semibold">
            <MapPin className="size-4 text-accent" /> {place}
          </span>
          <button
            className="text-sm font-semibold text-muted hover:text-danger"
            onClick={async () => {
              await clearLocationAction();
              router.refresh();
            }}
          >
            {t("remove")}
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
        <Select
          id="weather-region"
          defaultValue=""
          disabled={busy}
          onChange={(e) => {
            const r = UA_REGIONS.find((x) => x.id === e.target.value);
            if (r) save(r.lat, r.lon, locale === "uk" ? r.uk : r.en);
          }}
          aria-label={t("pickRegion")}
        >
          <option value="" disabled>
            {t("pickRegion")}
          </option>
          {UA_REGIONS.map((r) => (
            <option key={r.id} value={r.id}>
              {locale === "uk" ? r.uk : r.en}
            </option>
          ))}
        </Select>
        <Button
          variant="outline"
          loading={busy}
          onClick={() => {
            if (!navigator.geolocation) return toast.error(t("geoUnavailable"));
            setBusy(true);
            navigator.geolocation.getCurrentPosition(
              (pos) => save(pos.coords.latitude, pos.coords.longitude, t("myLocation")),
              () => {
                setBusy(false);
                toast.error(t("geoDenied"));
              },
              { enableHighAccuracy: false, timeout: 10_000, maximumAge: 3_600_000 },
            );
          }}
        >
          <LocateFixed /> {t("useMyLocation")}
        </Button>
      </div>
      <Switch
        checked={notify}
        onChange={async (v) => {
          setNotify(v);
          await updatePrefsAction({ notifyTyres: v });
        }}
        label={t("notify")}
        description={t("notifyHint")}
      />
      <p className="text-[11px] text-subtle">{t("attribution")}</p>
    </Card>
  );
}
