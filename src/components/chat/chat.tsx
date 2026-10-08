"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses, type UIMessage } from "ai";
import { motion } from "motion/react";
import { ArrowUp, Square, RotateCcw, Sparkles, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Markdown } from "./markdown";
import { clearChatAction } from "@/app/actions/settings";
import { cn } from "@/lib/utils";

const WRITE_TOOLS = new Set(["logOdometer", "addWorkItem", "addMaintenancePlan"]);

type ToolPart = {
  type: string;
  toolCallId: string;
  state: string;
  input?: Record<string, unknown>;
  output?: unknown;
  approval?: { id: string; approved?: boolean; isAutomatic?: boolean };
};

export function Chat({ initialMessages, carId, carName }: { initialMessages: UIMessage[]; carId?: string; carName?: string }) {
  const t = useTranslations("assistant");
  const tt = useTranslations("terms");
  const router = useRouter();
  const [input, setInput] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const { messages, sendMessage, status, stop, error, setMessages, addToolApprovalResponse } = useChat({
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: "/api/chat", body: { carId } }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    onFinish: () => router.refresh(),
  });
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  const send = (text: string) => {
    if (!text.trim() || busy) return;
    sendMessage({ text });
    setInput("");
  };

  const suggestions = ["due", "logOil", "noise", "costs"] as const;

  return (
    <div className="flex min-h-[calc(100dvh-14rem)] flex-col lg:min-h-[calc(100dvh-10rem)]">
      <div className="mb-4 flex items-center justify-between gap-2">
        {carName ? <span className="rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold">{t("focus", { car: carName })}</span> : <span />}
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              stop();
              setMessages([]);
              await clearChatAction();
            }}
          >
            <RotateCcw /> {t("clear")}
          </Button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4">
        {messages.length === 0 && (
          <div className="my-auto flex flex-col items-center py-10 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mb-4 grid size-16 place-items-center rounded-3xl bg-gradient-to-br from-violet-500 to-accent text-white shadow-lg"
            >
              <Sparkles className="size-8" />
            </motion.div>
            <p className="max-w-sm text-muted">{t("sub")}</p>
            <div className="mt-6 flex max-w-lg flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <button key={s} onClick={() => send(t(`suggestions.${s}`))} className="rounded-2xl border border-border bg-card px-4 py-2 text-sm font-medium shadow-card transition hover:border-accent">
                  {t(`suggestions.${s}`)}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("flex max-w-[88%] flex-col gap-2", m.role === "user" && "items-end")}>
              {m.parts.map((part, i) => {
                if (part.type === "text") {
                  if (!part.text.trim()) return null;
                  return m.role === "user" ? (
                    <div key={i} className="whitespace-pre-wrap rounded-3xl rounded-br-md bg-accent px-4 py-2.5 text-accent-fg">
                      {part.text}
                    </div>
                  ) : (
                    <div key={i} className="rounded-3xl rounded-bl-md border border-border bg-card px-4 py-3 shadow-card">
                      <Markdown text={part.text} />
                    </div>
                  );
                }
                if (part.type.startsWith("tool-")) {
                  return <ToolCard key={i} part={part as unknown as ToolPart} onDecide={(id, approved) => addToolApprovalResponse({ id, approved })} />;
                }
                return null;
              })}
            </div>
          </div>
        ))}
        {status === "submitted" && (
          <div className="flex gap-1.5 px-2 py-3">
            {[0, 1, 2].map((i) => (
              <motion.span key={i} className="size-2 rounded-full bg-muted" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: i * 0.15 }} />
            ))}
          </div>
        )}
        {error && <div className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{error.message || t("error")}</div>}
        <div ref={bottom} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="sticky bottom-24 mt-6 lg:bottom-6"
      >
        <div className="flex items-end gap-2 rounded-3xl border border-border bg-card p-2 shadow-xl focus-within:border-accent focus-within:ring-4 focus-within:ring-accent-soft transition-[border-color,box-shadow]">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder={t("placeholder")}
            rows={1}
            className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-base outline-none sm:text-[15px] placeholder:text-subtle field-sizing-content"
          />
          {busy ? (
            <Button type="button" size="icon" variant="dark" onClick={stop} aria-label={t("stop")}>
              <Square className="fill-current" />
            </Button>
          ) : (
            <Button type="submit" size="icon" disabled={!input.trim()} aria-label={t("send")}>
              <ArrowUp />
            </Button>
          )}
        </div>
        <p className="mt-2 text-center text-[11px] text-muted">{tt("aiNote")}</p>
      </form>
    </div>
  );
}

function ToolCard({ part, onDecide }: { part: ToolPart; onDecide: (id: string, approved: boolean) => void }) {
  const t = useTranslations("assistant");
  const name = part.type.slice(5);
  const input = part.input ?? {};

  if (!WRITE_TOOLS.has(name)) {
    if (part.state === "output-available") return null;
    return (
      <div className="flex items-center gap-2 px-1 text-xs text-muted">
        <Loader2 className="size-3 animate-spin" /> {t("tools.reading")}
      </div>
    );
  }

  const label =
    name === "logOdometer"
      ? t("tools.logOdometer", { value: String(input.value ?? "") })
      : name === "addWorkItem"
        ? t("tools.addWorkItem", { name: String(input.name ?? "") })
        : name === "createServiceVisit"
          ? t("tools.createServiceVisit", { title: String(input.title ?? "") })
          : t("tools.addMaintenancePlan", { name: String(input.name ?? "") });

  const details = Object.entries(input)
    .filter(([k, v]) => k !== "carId" && v != null && v !== "" && k !== "name" && k !== "title")
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");

  const failed = part.state === "output-available" && part.output && typeof part.output === "object" && "error" in part.output;

  return (
    <div className="w-full min-w-64 rounded-3xl border-2 border-accent/50 bg-accent-soft p-4">
      <div className="text-xs font-bold uppercase tracking-wider text-muted">{t("confirmTitle")}</div>
      <div className="mt-1 font-semibold">{label}</div>
      {details && <div className="mt-1 text-xs text-muted">{details}</div>}
      <div className="mt-3">
        {part.state === "approval-requested" && part.approval && !part.approval.isAutomatic ? (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onDecide(part.approval!.id, true)}>
              <Check /> {t("confirm")}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => onDecide(part.approval!.id, false)}>
              <X /> {t("reject")}
            </Button>
          </div>
        ) : part.state === "output-denied" || (part.state === "approval-responded" && part.approval?.approved === false) ? (
          <span className="text-sm text-muted">{t("rejected")}</span>
        ) : part.state === "output-available" ? (
          failed ? (
            <span className="text-sm text-danger">{String((part.output as { error: string }).error)}</span>
          ) : (
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-success">
              <Check className="size-4" /> {t("approved")}
            </span>
          )
        ) : (
          <Loader2 className="size-4 animate-spin text-muted" />
        )}
      </div>
    </div>
  );
}
