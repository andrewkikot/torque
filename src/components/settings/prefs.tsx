"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Monitor, Moon, Sun, LogOut } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Field, Input, Segmented, Select, Switch } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { updatePrefsAction, updateNameAction } from "@/app/actions/settings";
import { authClient } from "@/lib/auth-client";

const CURRENCIES = ["UAH", "EUR", "USD", "PLN", "GBP", "CZK", "RON", "GEL", "MDL", "KZT"];

type Prefs = {
  locale: "en" | "uk";
  units: "km" | "mi";
  currency: string;
  notifyVisitUpdates: boolean;
  notifyMaintenance: boolean;
  notifyMileageNudge: boolean;
};

export function PreferencesCard({
  initial,
  name,
  email,
  telegramUsername,
}: {
  initial: Prefs;
  name: string;
  /** null for accounts created via Telegram (placeholder email). */
  email: string | null;
  telegramUsername: string | null;
}) {
  const t = useTranslations("settings");
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [prefs, setPrefs] = useState(initial);
  const [nameValue, setNameValue] = useState(name);
  const [, start] = useTransition();

  const save = (patch: Partial<Prefs>) => {
    setPrefs((p) => ({ ...p, ...patch }));
    start(async () => {
      const r = await updatePrefsAction(patch);
      if (!r.ok) toast.error(r.error);
      else toast.success(t("saved"), { duration: 1200 });
      if (patch.locale) router.refresh();
    });
  };

  return (
    <>
      <Card className="flex flex-col gap-5">
        <h2 className="font-display text-lg font-semibold">{t("profile")}</h2>
        <Field label={t("name")}>
          <Input
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={async () => {
              if (nameValue.trim() && nameValue !== name) {
                const r = await updateNameAction(nameValue);
                if (r.ok) toast.success(t("saved"), { duration: 1200 });
              }
            }}
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <span className="mb-1.5 block text-sm font-semibold">{t("language")}</span>
            <Segmented
              className="w-full"
              value={prefs.locale}
              onChange={(v) => save({ locale: v })}
              options={[
                { value: "en", label: "🇬🇧 English" },
                { value: "uk", label: "🇺🇦 Українська" },
              ]}
            />
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-semibold">{t("theme")}</span>
            <Segmented
              className="w-full"
              value={(theme as "light" | "dark" | "system") ?? "system"}
              onChange={setTheme}
              options={[
                { value: "light", label: <Sun className="mx-auto size-4" aria-label={t("themeLight")} /> },
                { value: "dark", label: <Moon className="mx-auto size-4" aria-label={t("themeDark")} /> },
                { value: "system", label: <Monitor className="mx-auto size-4" aria-label={t("themeSystem")} /> },
              ]}
            />
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-semibold">{t("units")}</span>
            <Segmented
              className="w-full"
              value={prefs.units}
              onChange={(v) => save({ units: v })}
              options={[
                { value: "km", label: "km" },
                { value: "mi", label: "mi" },
              ]}
            />
          </div>
          <Field label={t("currency")}>
            <Select value={prefs.currency} onChange={(e) => save({ currency: e.target.value })}>
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 font-display text-lg font-semibold">{t("notifications")}</h2>
        <Switch checked={prefs.notifyVisitUpdates} onChange={(v) => save({ notifyVisitUpdates: v })} label={t("notifyVisitUpdates")} />
        <Switch checked={prefs.notifyMaintenance} onChange={(v) => save({ notifyMaintenance: v })} label={t("notifyMaintenance")} />
        <Switch checked={prefs.notifyMileageNudge} onChange={(v) => save({ notifyMileageNudge: v })} label={t("notifyMileageNudge")} />
      </Card>

      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">{t("account")}</h2>
          <p className="text-sm text-muted">
            {email ? t("signedInAs", { email }) : t("signedInTelegram", { username: telegramUsername ?? "" })}
          </p>
        </div>
        <SignOut />
      </Card>
    </>
  );
}

function SignOut() {
  const t = useTranslations("common");
  const router = useRouter();
  return (
    <Button
      variant="outline"
      onClick={async () => {
        await authClient.signOut();
        router.push("/");
        router.refresh();
      }}
    >
      <LogOut /> {t("signOut")}
    </Button>
  );
}
