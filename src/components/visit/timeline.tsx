"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { motion } from "motion/react";
import { User, Wrench, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { STATUS_EMOJI, type VisitStatusValue } from "@/lib/domain/visit-status";
import { formatDateTime, formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TimelineEvent, VisitWork } from "./types";

const AUTHOR_ICON = { owner: User, shop: Wrench, bot: Send, ai: Sparkles, customer: User } as const;

const AUTHOR_STYLE: Record<string, string> = {
  owner: "bg-accent text-accent-fg",
  shop: "bg-fg text-bg",
  bot: "bg-sky-500 text-white",
  ai: "bg-violet-500 text-white",
  customer: "bg-accent text-accent-fg",
};

export function Timeline({
  events,
  items,
  currency,
  onDecide,
  viewer = "owner",
}: {
  events: TimelineEvent[];
  items: VisitWork[];
  currency: string;
  /** Present when the viewer may approve/decline extra work. */
  onDecide?: (eventId: string, approved: boolean) => Promise<{ ok: boolean; error?: string }>;
  /** Whose screen this is: labels "You" accordingly. */
  viewer?: "owner" | "shop" | "customer";
}) {
  const t = useTranslations();
  const locale = useLocale();
  const tz = useTimeZone();
  const sorted = [...events].reverse();

  return (
    <ol className="flex flex-col gap-4">
      {sorted.map((e, idx) => (
        <motion.li
          key={e.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(idx, 8) * 0.03 }}
          className="flex gap-3"
        >
          <span className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-bold", AUTHOR_STYLE[e.author])}>
            {e.kind === "status" && e.status ? (
              STATUS_EMOJI[e.status as VisitStatusValue]
            ) : (
              <AuthorIcon author={e.author} />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 text-xs text-muted">
              <span className="font-semibold text-fg">
                {authorLabel(t, e, viewer)}
              </span>
              <time>{formatDateTime(e.createdAt, locale, tz)}</time>
            </div>
            <EventBody e={e} items={items} currency={currency} onDecide={onDecide} />
          </div>
        </motion.li>
      ))}
    </ol>
  );
}

function AuthorIcon({ author }: { author: string }) {
  const Icon = AUTHOR_ICON[author as keyof typeof AUTHOR_ICON] ?? User;
  return <Icon className="size-3.5" />;
}

function authorLabel(t: ReturnType<typeof useTranslations>, e: TimelineEvent, viewer: "owner" | "shop" | "customer") {
  if (e.author === "shop") {
    // Inside the workshop, show who on the team did it; customers see "Workshop · Name".
    if (viewer === "shop") return e.authorName ?? t("visit.by.shop");
    return e.authorName ? `${t("visit.by.shop")} · ${e.authorName}` : t("visit.by.shop");
  }
  if (e.author === viewer || (viewer === "owner" && e.author === "bot")) return t("visit.by.you");
  return t(`visit.by.${e.author}`);
}

function EventBody({
  e,
  items,
  currency,
  onDecide,
}: {
  e: TimelineEvent;
  items: VisitWork[];
  currency: string;
  onDecide?: (eventId: string, approved: boolean) => Promise<{ ok: boolean; error?: string }>;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [busy, setBusy] = useState<"yes" | "no" | null>(null);

  switch (e.kind) {
    case "status":
      return (
        <div className="mt-1">
          <span className="font-semibold">{t("visit.event.status", { status: t(`status.${e.status}`) })}</span>
          {e.message && <p className="mt-1 text-sm text-muted">{e.message}</p>}
        </div>
      );
    case "work":
      return (
        <div className="mt-1 flex items-center justify-between gap-3 pr-1 text-sm">
          <span>{t("visit.event.work", { name: e.message ?? "" })}</span>
          <span className="tabular font-semibold">{formatMoney(Number(e.amount ?? 0), currency, locale)}</span>
        </div>
      );
    case "approval_decision": {
      const approved = !!(e.data as { approved?: boolean } | null)?.approved;
      return (
        <div className="mt-1">
          <Badge tone={approved ? "success" : "danger"}>{t("visit.event.approvalDecision", { approved: String(approved) })}</Badge>
        </div>
      );
    }
    case "approval_request": {
      const data = (e.data ?? {}) as { itemIds?: string[]; decided?: boolean; approved?: boolean };
      const reqItems = items.filter((i) => data.itemIds?.includes(i.id));
      const decide = async (approved: boolean) => {
        setBusy(approved ? "yes" : "no");
        const r = await onDecide!(e.id, approved);
        setBusy(null);
        if (!r.ok) return toast.error(r.error ?? "Error");
        router.refresh();
      };
      return (
        <div className={cn("mt-2 rounded-3xl border-2 p-4", data.decided ? "border-border" : "border-warning/60 bg-warning/5")}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="font-semibold">✋ {t("visit.approvalRequest")}</span>
            {data.decided ? (
              <Badge tone={data.approved ? "success" : "danger"}>{data.approved ? t("visit.approved") : t("visit.declined")}</Badge>
            ) : (
              <Badge tone="warning">{t("visit.pending")}</Badge>
            )}
          </div>
          {e.message && <p className="mb-3 text-sm">{e.message}</p>}
          {reqItems.length > 0 && (
            <ul className="mb-3 flex flex-col gap-1 text-sm">
              {reqItems.map((i) => (
                <li key={i.id} className="flex justify-between gap-3">
                  <span>{i.name}</span>
                  <span className="tabular">{formatMoney(Number(i.cost), currency, locale)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
            <span className="tabular font-display font-bold">{formatMoney(Number(e.amount ?? 0), currency, locale)}</span>
            {onDecide && !data.decided && (
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" loading={busy === "no"} disabled={!!busy} onClick={() => decide(false)}>
                  {t("visit.decline")}
                </Button>
                <Button size="sm" loading={busy === "yes"} disabled={!!busy} onClick={() => decide(true)}>
                  {t("visit.approve")}
                </Button>
              </div>
            )}
          </div>
        </div>
      );
    }
    default:
      return (
        <div className="mt-1 rounded-3xl rounded-tl-md bg-soft px-4 py-3">
          {e.message && <p className="whitespace-pre-wrap text-sm">{e.message}</p>}
          {e.photoUrl && (
            <a href={e.photoUrl} target="_blank" rel="noreferrer" className="mt-2 block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={e.photoUrl} alt="" className="max-h-72 rounded-2xl object-cover" loading="lazy" />
            </a>
          )}
        </div>
      );
  }
}
