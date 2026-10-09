import "server-only";
import { and, desc, eq, gte, isNotNull, lte } from "drizzle-orm";
import { getEntitlements } from "@/lib/services/licenses";
import { db, schema } from "@/db";
import { listCars, carLabel } from "@/lib/services/cars";
import { plansWithDue } from "@/lib/services/maintenance";
import { translator } from "@/i18n/server-translate";
import { tgSend, escapeHtml } from "@/lib/telegram-api";
import { formatNumber } from "@/lib/format";
import { appUrl } from "@/lib/app-url";

const DAY = 86_400_000;

async function alreadySent(userId: string, key: string) {
  const inserted = await db
    .insert(schema.remindersLog)
    .values({ userId, key })
    .onConflictDoNothing()
    .returning({ id: schema.remindersLog.id });
  return inserted.length === 0;
}

export async function runDailyReminders() {
  const users = await db.query.userSettings.findMany({ where: isNotNull(schema.userSettings.telegramChatId) });
  let messages = 0;
  const month = new Date().toISOString().slice(0, 7);

  for (const s of users) {
    try {
      const t = translator(s.locale);
      const cars = await listCars(s.userId);
      const lines: string[] = [];

      for (const car of cars) {
        if (s.notifyMaintenance) {
          const { plans } = await plansWithDue(car);
          for (const p of plans) {
            if (p.due.status !== "overdue" && p.due.status !== "soon") continue;
            // One reminder per plan per status per service cycle.
            const key = `due:${p.id}:${p.due.status}:${p.lastDoneAt?.toISOString() ?? "never"}`;
            if (await alreadySent(s.userId, key)) continue;
            const when: string[] = [];
            if (p.due.kmLeft != null) when.push(`${formatNumber(p.due.kmLeft, s.locale)} ${s.units}`);
            if (p.due.daysLeft != null) when.push(t("common.days", { count: p.due.daysLeft }));
            lines.push(
              `<b>${escapeHtml(carLabel(car))}</b>: ` +
                (p.due.status === "overdue"
                  ? t("notify.dueOverdue", { name: escapeHtml(p.name) })
                  : t("notify.dueSoon", { name: escapeHtml(p.name), when: when.join(" / ") })),
            );
          }
        }
        if (s.notifyMileageNudge) {
          const last = await db.query.odometerReadings.findFirst({
            where: eq(schema.odometerReadings.carId, car.id),
            orderBy: [desc(schema.odometerReadings.recordedAt)],
          });
          const lastAt = last?.recordedAt ?? car.createdAt;
          if (Date.now() - lastAt.getTime() > 30 * DAY && !(await alreadySent(s.userId, `nudge:${car.id}:${month}`))) {
            await tgSend(s.telegramChatId!, t("notify.nudge", { car: escapeHtml(carLabel(car)) }), { silent: true });
            messages++;
          }
        }
      }

      if (lines.length) {
        await tgSend(s.telegramChatId!, `${t("notify.dueTitle")}\n\n${lines.join("\n")}`, {
          buttons: [[{ text: t("notify.open"), url: `${appUrl()}/garage` }]],
        });
        messages++;
      }
    } catch (e) {
      console.error("reminder failed for", s.userId, e);
    }
  }
  messages += await licenseReminders();
  return { users: users.length, messages };
}

/** Tell workshop owners before (7 days, 1 day) and when their Pro license runs out. */
async function licenseReminders() {
  const now = Date.now();
  const soon = await db.query.licenses.findMany({
    where: and(eq(schema.licenses.status, "active"), lte(schema.licenses.expiresAt, new Date(now + 7 * DAY)), gte(schema.licenses.expiresAt, new Date(now - DAY))),
  });
  let sent = 0;
  const seen = new Set<string>();
  for (const l of soon) {
    if (!l.workshopId || seen.has(l.workshopId)) continue;
    seen.add(l.workshopId);
    // Only the latest expiry matters when licenses were stacked.
    const ent = await getEntitlements(l.workshopId);
    if (ent.plan === "pro" && ent.expiresAt && ent.expiresAt.getTime() - now > 7 * DAY) continue;
    const expiry = ent.expiresAt ?? l.expiresAt!;
    const left = Math.ceil((expiry.getTime() - now) / DAY);
    const bucket = left <= 0 ? "expired" : left <= 1 ? "1d" : "7d";
    const ws = await db.query.workshops.findFirst({ where: eq(schema.workshops.id, l.workshopId) });
    const owners = await db
      .select({ userId: schema.workshopMembers.userId, chatId: schema.userSettings.telegramChatId, locale: schema.userSettings.locale })
      .from(schema.workshopMembers)
      .innerJoin(schema.userSettings, eq(schema.userSettings.userId, schema.workshopMembers.userId))
      .where(and(eq(schema.workshopMembers.workshopId, l.workshopId), eq(schema.workshopMembers.role, "owner")));
    for (const o of owners) {
      if (!o.chatId || (await alreadySent(o.userId, `lic:${l.workshopId}:${expiry.toISOString()}:${bucket}`))) continue;
      const t = translator(o.locale);
      const text = bucket === "expired" ? t("plan.botExpired", { workshop: escapeHtml(ws?.name ?? "") }) : t("plan.botExpiring", { workshop: escapeHtml(ws?.name ?? ""), count: Math.max(1, left) });
      await tgSend(o.chatId, text, { buttons: [[{ text: t("plan.renew"), url: `${appUrl()}/w/settings#plan` }]] });
      sent++;
    }
  }
  return sent;
}
