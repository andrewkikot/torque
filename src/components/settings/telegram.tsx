"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Send, CheckCircle2, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createTelegramLinkAction, disconnectTelegramAction, telegramStatusAction } from "@/app/actions/settings";

export function TelegramCard({
  configured,
  connected,
  username,
  bot,
}: {
  configured: boolean;
  connected: boolean;
  username: string | null;
  bot: string | null;
}) {
  const t = useTranslations("telegram");
  const router = useRouter();
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // While a link is pending, poll until the bot confirms the connection.
  useEffect(() => {
    if (!link || connected) return;
    const id = setInterval(async () => {
      const s = await telegramStatusAction();
      if (s.connected) {
        setLink(null);
        router.refresh();
      }
    }, 3000);
    return () => clearInterval(id);
  }, [link, connected, router]);

  return (
    <Card>
      <div className="mb-1 flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-xl bg-sky-500 text-white">
          <Send className="size-4" />
        </span>
        <h2 className="font-display text-lg font-semibold">{t("title")}</h2>
      </div>
      <p className="mb-4 text-sm text-muted">{t("sub")}</p>
      {!configured ? (
        <p className="rounded-2xl bg-soft p-3 text-sm text-muted">{t("notConfigured")}</p>
      ) : connected ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2 font-semibold text-success">
            <CheckCircle2 className="size-5" /> {username ? t("connected", { username }) : t("connectedNoName")}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await disconnectTelegramAction();
              router.refresh();
            }}
          >
            {t("disconnect")}
          </Button>
        </div>
      ) : link ? (
        <div className="flex flex-col gap-3">
          <a href={link} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-sky-500 px-4 font-semibold text-white hover:brightness-110">
            <ExternalLink className="size-4" /> {t("openBot", { bot: bot ?? "bot" })}
          </a>
          <p className="text-sm text-muted">{t("connecting")}</p>
        </div>
      ) : (
        <Button
          loading={busy}
          className="bg-sky-500 text-white"
          onClick={async () => {
            setBusy(true);
            const r = await createTelegramLinkAction();
            setBusy(false);
            if (!r.ok) return toast.error(r.error);
            setLink(r.data.url);
            window.open(r.data.url, "_blank");
          }}
        >
          <Send /> {t("connect")}
        </Button>
      )}
      {configured && (
        <div className="mt-4 rounded-2xl bg-soft p-3 font-mono text-xs leading-6 text-muted">
          /km 84500 · /due · /visit · /cars · /lang
        </div>
      )}
    </Card>
  );
}
