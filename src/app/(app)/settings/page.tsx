import { getTranslations } from "next-intl/server";
import { requireUser, getSettings } from "@/lib/session";
import { getPublicAiSettings } from "@/lib/services/ai-settings";
import { PageHeader } from "@/components/ui/card";
import { PreferencesCard } from "@/components/settings/prefs";
import { TelegramCard } from "@/components/settings/telegram";
import { AiCard } from "@/components/settings/ai";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const [settings, ai] = await Promise.all([getSettings(user.id), getPublicAiSettings(user.id)]);
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
        <PreferencesCard
          name={user.name}
          email={user.email}
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
