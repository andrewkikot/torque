import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { tgSend, escapeHtml } from "@/lib/telegram-api";
import { translator, type T } from "@/i18n/server-translate";
import { STATUS_EMOJI, type VisitStatusValue } from "@/lib/domain/visit-status";
import { formatMoney } from "@/lib/format";
import { appUrl } from "@/lib/app-url";
import { memberChats } from "@/lib/services/workshops";
import type { Car, ServiceVisit, VisitEvent, WorkItem, Workshop } from "@/db/schema";

type VisitCtx = ServiceVisit & { car: Car | null; workshop?: Workshop | null };
type Recipient = { chatId: string; t: T; locale: "en" | "uk"; url: string; isOwner: boolean };

const vehicle = (v: VisitCtx) =>
  escapeHtml(v.car ? v.car.nickname || `${v.car.make} ${v.car.model}` : [v.vehicleMake, v.vehicleModel].filter(Boolean).join(" ") || v.vehiclePlate || "");

/** Everyone following a job: the car owner (if linked) and Telegram subscribers (walk-ins). */
async function followers(visit: VisitCtx, opts: { force?: boolean } = {}): Promise<Recipient[]> {
  const out: Recipient[] = [];
  if (visit.car) {
    const s = await db.query.userSettings.findFirst({ where: eq(schema.userSettings.userId, visit.car.userId) });
    if (s?.telegramChatId && (opts.force || s.notifyVisitUpdates)) {
      out.push({ chatId: s.telegramChatId, t: translator(s.locale), locale: s.locale, url: `${appUrl()}/visits/${visit.id}`, isOwner: true });
    }
  }
  const subs = await db.query.visitSubscribers.findMany({ where: eq(schema.visitSubscribers.visitId, visit.id) });
  for (const sub of subs) {
    if (out.some((r) => r.chatId === sub.telegramChatId)) continue;
    out.push({ chatId: sub.telegramChatId, t: translator(sub.locale), locale: sub.locale, url: `${appUrl()}/v/${visit.shareToken}`, isOwner: false });
  }
  return out;
}

export async function notifyVisitUpdate(visit: VisitCtx, extra: { message?: string | null; photo?: boolean; total?: number }) {
  const status = visit.status as VisitStatusValue;
  for (const r of await followers(visit)) {
    const lines = [
      `${STATUS_EMOJI[status]} <b>${vehicle(visit)}</b> · ${escapeHtml(visit.title)}`,
      r.t("notify.statusNow", { status: r.t(`status.${status}`) }),
    ];
    if (visit.workshop?.name) lines.push(`🔧 ${escapeHtml(visit.workshop.name)}`);
    if (extra.total != null) lines.push(`<b>${r.t("notify.total")}: ${formatMoney(extra.total, visit.currency, r.locale)}</b>`);
    if (extra.photo) lines.push(r.t("notify.newPhoto"));
    if (extra.message) lines.push(`💬 <i>${escapeHtml(extra.message)}</i>`);
    await tgSend(r.chatId, lines.join("\n"), { buttons: [[{ text: r.t("notify.open"), url: r.url }]] });
  }
}

export async function notifyApprovalRequest(visit: VisitCtx, event: VisitEvent, items: WorkItem[]) {
  for (const r of await followers(visit, { force: true })) {
    const list = items.map((i) => `• ${escapeHtml(i.name)} — ${formatMoney(Number(i.cost), visit.currency, r.locale)}`).join("\n");
    const text = [
      `✋ <b>${r.t("notify.approvalTitle")}</b>`,
      `${vehicle(visit)} · ${escapeHtml(visit.title)}`,
      event.message ? `\n💬 <i>${escapeHtml(event.message)}</i>` : "",
      `\n${list}`,
      `\n<b>${r.t("notify.total")}: ${formatMoney(Number(event.amount ?? 0), visit.currency, r.locale)}</b>`,
    ].join("\n");
    await tgSend(r.chatId, text, {
      buttons: [
        [
          { text: `✅ ${r.t("notify.approve")}`, callback_data: `ap:${event.id}:1` },
          { text: `❌ ${r.t("notify.decline")}`, callback_data: `ap:${event.id}:0` },
        ],
        [{ text: r.t("notify.open"), url: r.url }],
      ],
    });
  }
}

/** Sent to the car owner when a workshop checks their car in with the code. */
export async function notifyCheckIn(visit: VisitCtx) {
  if (!visit.car) return;
  const s = await db.query.userSettings.findFirst({ where: eq(schema.userSettings.userId, visit.car.userId) });
  if (!s?.telegramChatId) return;
  const t = translator(s.locale);
  const text = [
    `🔧 <b>${t("notify.checkedInTitle", { workshop: escapeHtml(visit.workshop?.name ?? "") })}</b>`,
    `${vehicle(visit)} · ${escapeHtml(visit.title)}`,
    t("notify.checkedInSub"),
  ].join("\n");
  await tgSend(s.telegramChatId, text, {
    buttons: [
      [{ text: t("notify.open"), url: `${appUrl()}/visits/${visit.id}` }],
      [{ text: t("notify.notMyCar"), callback_data: `nm:${visit.id}` }],
    ],
  });
}

type WorkshopEvent = { kind: "approval"; approved: boolean; amount: number } | { kind: "note"; message: string } | { kind: "detached" };

/** Push to every workshop member with Telegram linked. */
export async function notifyWorkshop(visit: VisitCtx, e: WorkshopEvent) {
  if (!visit.workshopId) return;
  for (const m of await memberChats(visit.workshopId)) {
    const t = translator(m.locale);
    const head = `<b>${vehicle(visit)}</b>${visit.vehiclePlate ? ` · ${escapeHtml(visit.vehiclePlate)}` : ""} · ${escapeHtml(visit.title)}`;
    const body =
      e.kind === "approval"
        ? e.approved
          ? t("notify.wsApproved", { amount: formatMoney(e.amount, visit.currency, m.locale) })
          : t("notify.wsDeclined")
        : e.kind === "note"
          ? `💬 ${t("notify.wsNote")}\n<i>${escapeHtml(e.message)}</i>`
          : t("notify.wsDetached");
    await tgSend(m.chatId!, `${body}\n${head}`, { buttons: [[{ text: t("notify.openJob"), url: `${appUrl()}/w/jobs/${visit.id}` }]] });
  }
}
