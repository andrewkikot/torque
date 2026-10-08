"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type State = { kind: "idle" } | { kind: "waiting"; id: string; botUrl: string } | { kind: "error"; message: string };

/** "Sign in with Telegram": open the bot, confirm there, and this tab signs in by itself. */
export function TelegramLogin({ next }: { next: string }) {
  const t = useTranslations("auth");
  const [state, setState] = useState<State>({ kind: "idle" });
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => void (timer.current && clearInterval(timer.current)), []);

  async function start() {
    const res = await fetch("/api/telegram-login/start", { method: "POST" });
    const data = await res.json();
    if (!res.ok) return setState({ kind: "error", message: data.error ?? t("error") });
    setState({ kind: "waiting", id: data.id, botUrl: data.botUrl });
    // On phones this hands off to the Telegram app; on desktop it opens a tab.
    window.open(data.botUrl, "_blank", "noopener");
    const started = Date.now();
    timer.current = setInterval(async () => {
      if (Date.now() - started > 10 * 60_000) {
        clearInterval(timer.current!);
        return setState({ kind: "error", message: t("telegramExpired") });
      }
      const r = await fetch(`/api/telegram-login/poll?id=${encodeURIComponent(data.id)}&next=${encodeURIComponent(next)}`, { cache: "no-store" }).then((x) => x.json());
      if (r.status === "approved") {
        clearInterval(timer.current!);
        window.location.href = r.url;
      } else if (r.status === "declined" || r.status === "expired") {
        clearInterval(timer.current!);
        setState({ kind: "error", message: r.status === "declined" ? t("telegramDeclined") : t("telegramExpired") });
      }
    }, 2000);
  }

  if (state.kind === "waiting") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-sky-500/10 p-4 text-center">
        <span className="flex items-center gap-2 text-sm font-semibold text-sky-600 dark:text-sky-400">
          <Loader2 className="size-4 animate-spin" /> {t("telegramWaiting")}
        </span>
        <a href={state.botUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold underline underline-offset-4">
          {t("telegramOpen")}
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" size="lg" onClick={start} className="bg-sky-500 text-white hover:brightness-110">
        <Send /> {t("telegram")}
      </Button>
      <p className="text-center text-xs text-muted">{state.kind === "error" ? <span className="text-danger">{state.message}</span> : t("telegramHint")}</p>
    </div>
  );
}
