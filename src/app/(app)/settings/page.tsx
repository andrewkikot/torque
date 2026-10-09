import { getTranslations } from "next-intl/server";
import { requireUser, getSettings } from "@/lib/session";
import { getPublicAiSettings } from "@/lib/services/ai-settings";
import { PageHeader } from "@/components/ui/card";
import { PreferencesCard } from "@/components/settings/prefs";
import { TelegramCard } from "@/components/settings/telegram";
import { AiCard } from "@/components/settings/ai";
import { isTelegramEmail } from "@/lib/services/telegram-login";
import { myWorkshops } from "@/lib/services/workshops";
import { WorkshopEntryCard } from "@/components/settings/workshop-card";
import { WeatherCard } from "@/components/settings/weather-card";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const [settings, ai, workshops] = await Promise.all([getSettings(user.id), getPublicAiSettings(user.id), myWorkshops(user.id)]);
  const t = await getTranslations("settings");
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("title")} />
      <div className="flex flex-col gap-5">
        <AiCard current={ai} />
        <TelegramCard
          configured={!!process.env.TELEGRAM_BOT_TOKEN && !!process.env.TELEGRAM_BOT_USERNAME}
          connected={!!settings.telegramChatId}
          username={settings.telegramUsername}
          bot={process.env.TELEGRAM_BOT_USERNAME ?? null}
        />
        <WeatherCard place={settings.weatherPlace} notifyTyres={settings.notifyTyres} />
        <WorkshopEntryCard workshops={workshops.map((w) => ({ id: w.workshop.id, name: w.workshop.name }))} />
        <PreferencesCard
          name={user.name}
          email={isTelegramEmail(user.email) ? null : user.email}
          telegramUsername={settings.telegramUsername}
          initial={{
            locale: settings.locale,
            units: settings.units,
            currency: settings.currency,
            notifyVisitUpdates: settings.notifyVisitUpdates,
            notifyMaintenance: settings.notifyMaintenance,
            notifyMileageNudge: settings.notifyMileageNudge,
          }}
        />
      </div>
    </div>
  );
}
