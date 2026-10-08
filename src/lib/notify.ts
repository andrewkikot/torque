import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { tgSend, escapeHtml } from "@/lib/telegram-api";
import { translator } from "@/i18n/server-translate";
import { STATUS_EMOJI, type VisitStatusValue } from "@/lib/domain/visit-status";
import { formatMoney } from "@/lib/format";
import type { Car, ServiceVisit, VisitEvent, WorkItem } from "@/db/schema";
import { appUrl } from "@/lib/app-url";


async function target(userId: string) {
  const s = await db.query.userSettings.findFirst({ where: eq(schema.userSettings.userId, userId) });
  if (!s?.telegramChatId) return null;
  return s;
}

const carName = (c: Pick<Car, "nickname" | "make" | "model">) => escapeHtml(c.nickname || `${c.make} ${c.model}`);

export async function notifyVisitUpdate(
  userId: string,
  visit: ServiceVisit & { car: Car },
  extra: { message?: string | null; photo?: boolean },
) {
  const s = await target(userId);
  if (!s || !s.notifyVisitUpdates) return;
  const t = translator(s.locale);
  const status = visit.status as VisitStatusValue;
  const lines = [
    `${STATUS_EMOJI[status]} <b>${carName(visit.car)}</b> · ${escapeHtml(visit.title)}`,
    t("notify.statusNow", { status: t(`status.${status}`) }),
  ];
  if (extra.photo) lines.push(t("notify.newPhoto"));
  if (extra.message) lines.push(`💬 <i>${escapeHtml(extra.message)}</i>`);
  await tgSend(s.telegramChatId!, lines.join("\n"), {
    buttons: [[{ text: t("notify.open"), url: `${appUrl()}/visits/${visit.id}` }]],
  });
}

export async function notifyApprovalRequest(
  userId: string,
  visit: ServiceVisit & { car: Car },
  event: VisitEvent,
  items: WorkItem[],
) {
  const s = await target(userId);
  if (!s) return;
  const t = translator(s.locale);
  const list = items
    .map((i) => `• ${escapeHtml(i.name)} — ${formatMoney(Number(i.cost), visit.currency, s.locale)}`)
    .join("\n");
  const text = [
    `✋ <b>${t("notify.approvalTitle")}</b>`,
    `${carName(visit.car)} · ${escapeHtml(visit.title)}`,
    event.message ? `\n💬 <i>${escapeHtml(event.message)}</i>` : "",
    `\n${list}`,
    `\n<b>${t("notify.total")}: ${formatMoney(Number(event.amount ?? 0), visit.currency, s.locale)}</b>`,
  ].join("\n");
  await tgSend(s.telegramChatId!, text, {
    buttons: [
      [
        { text: `✅ ${t("notify.approve")}`, callback_data: `ap:${event.id}:1` },
        { text: `❌ ${t("notify.decline")}`, callback_data: `ap:${event.id}:0` },
      ],
      [{ text: t("notify.open"), url: `${appUrl()}/visits/${visit.id}` }],
    ],
  });
}
