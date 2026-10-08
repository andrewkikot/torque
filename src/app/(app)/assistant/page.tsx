import { getTranslations } from "next-intl/server";
import { Sparkles, KeyRound } from "lucide-react";
import type { UIMessage } from "ai";
import { requireUser } from "@/lib/session";
import { getPublicAiSettings } from "@/lib/services/ai-settings";
import { loadConversation } from "@/lib/ai/history";
import { listCars, carLabel } from "@/lib/services/cars";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { Chat } from "@/components/chat/chat";
import { providerMeta } from "@/lib/ai/providers";
import { accentStyle } from "@/lib/utils";

export const metadata = { title: "Assistant" };

export default async function AssistantPage({ searchParams }: PageProps<"/assistant">) {
  const { carId } = await searchParams;
  const user = await requireUser();
  const [ai, history, cars] = await Promise.all([getPublicAiSettings(user.id), loadConversation<UIMessage>(user.id, "web"), listCars(user.id)]);
  const t = await getTranslations("assistant");
  const focus = cars.find((c) => c.id === carId);

  return (
    <div className="mx-auto max-w-3xl" style={focus ? accentStyle(focus.accentColor) : undefined}>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            {t("title")} <Sparkles className="size-6 text-violet-500" />
          </span>
        }
        sub={ai ? `${providerMeta(ai.provider).label} · ${ai.model}` : t("sub")}
      />
      {ai?.enabled ? (
        <Chat initialMessages={history} carId={focus?.id} carName={focus ? carLabel(focus) : undefined} />
      ) : (
        <EmptyState
          icon={<KeyRound className="size-7 text-accent" />}
          title={t("notConfiguredTitle")}
          sub={t("notConfiguredSub")}
          action={<ButtonLink href="/settings">{t("configure")}</ButtonLink>}
        />
      )}
    </div>
  );
}
