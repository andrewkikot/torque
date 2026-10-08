import "server-only";
import { Bot, InlineKeyboard, type Context } from "grammy";
import { after } from "next/server";
import { and, eq, gt } from "drizzle-orm";
import { db, schema } from "@/db";
import { translator, type T } from "@/i18n/server-translate";
import { listCars, logOdometer, carLabel } from "@/lib/services/cars";
import { plansWithDue } from "@/lib/services/maintenance";
import { listVisits, decideApproval, visitTotal } from "@/lib/services/visits";
import { getUserModel } from "@/lib/services/ai-settings";
import { AppError } from "@/lib/errors";
import { formatMoney, formatNumber } from "@/lib/format";
import { escapeHtml } from "@/lib/telegram-api";
import { STATUS_EMOJI } from "@/lib/domain/visit-status";
import { parseMileage, localeFromTelegram } from "./parse";
import { chat, resolvePending, type BotAiResult, type PendingAction } from "./ai";
import type { UserSettings } from "@/db/schema";

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

type Linked = { settings: UserSettings; t: T };

async function linkedUser(ctx: Context): Promise<Linked | null> {
  const chatId = String(ctx.chat?.id ?? "");
  if (!chatId) return null;
  const settings = await db.query.userSettings.findFirst({ where: eq(schema.userSettings.telegramChatId, chatId) });
  if (!settings) return null;
  return { settings, t: translator(settings.locale) };
}

function guestT(ctx: Context) {
  return translator(localeFromTelegram(ctx.from?.language_code));
}

async function requireLinked(ctx: Context): Promise<Linked | null> {
  const u = await linkedUser(ctx);
  if (!u) await ctx.reply(guestT(ctx)("bot.notLinked"));
  return u;
}

async function saveKm(ctx: Context, u: Linked, carId: string, value: number, force = false) {
  const { t, settings } = u;
  try {
    const r = await logOdometer(settings.userId, carId, value, "telegram", { allowDecrease: force });
    await ctx.reply(
      t("bot.kmSaved", {
        car: carLabel(r.car),
        value: formatNumber(r.current, settings.locale),
        units: settings.units,
        delta: formatNumber(Math.max(0, r.delta), settings.locale),
      }),
    );
  } catch (e) {
    if (e instanceof AppError && e.code === "invalid" && /lower/.test(e.message)) {
      const cars = await listCars(settings.userId);
      const car = cars.find((c) => c.id === carId);
      await ctx.reply(
        t("bot.kmLower", { value: formatNumber(value, settings.locale), current: formatNumber(car?.currentOdometer ?? 0, settings.locale) }),
        { reply_markup: new InlineKeyboard().text(t("bot.saveAnyway"), `kf:${carId}:${value}`) },
      );
      return;
    }
    throw e;
  }
}

function describeAction(t: T, a: PendingAction) {
  const i = a.input;
  switch (a.toolName) {
    case "logOdometer":
      return t("assistant.tools.logOdometer", { value: String(i.value) });
    case "addWorkItem":
      return t("assistant.tools.addWorkItem", { name: String(i.name) }) + (i.cost ? ` · ${i.cost}` : "");
    case "createServiceVisit":
      return t("assistant.tools.createServiceVisit", { title: String(i.title) });
    case "addMaintenancePlan":
      return t("assistant.tools.addMaintenancePlan", { name: String(i.name) });
    default:
      return a.toolName;
  }
}

async function sendAiResult(ctx: Context, u: Linked, r: BotAiResult) {
  const { t } = u;
  if (r.kind === "not_configured") return ctx.reply(t("bot.aiOff"));
  if (r.kind === "error") return ctx.reply(`⚠️ ${r.message}`);
  if (r.text) await ctx.reply(r.text);
  if (r.pending.length) {
    const lines = r.pending.map((a) => `• ${describeAction(t, a)}`).join("\n");
    await ctx.reply(`${t("bot.confirmAction")}\n${lines}`, {
      reply_markup: new InlineKeyboard().text(t("bot.yes"), "ai:1").text(t("bot.no"), "ai:0"),
    });
  }
}

/** Run slow AI work after the webhook has answered, so Telegram doesn't retry. */
function inBackground(ctx: Context, work: () => Promise<unknown>) {
  const typing = setInterval(() => ctx.replyWithChatAction("typing").catch(() => {}), 4500);
  ctx.replyWithChatAction("typing").catch(() => {});
  after(async () => {
    try {
      await work();
    } catch (e) {
      console.error("bot background error", e);
      await ctx.reply("⚠️").catch(() => {});
    } finally {
      clearInterval(typing);
    }
  });
}

export function createBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  const bot = new Bot(token);

  bot.command("start", async (ctx) => {
    const code = ctx.match?.trim();
    if (!code) {
      const u = await linkedUser(ctx);
      return ctx.reply(u ? u.t("bot.help") : guestT(ctx)("bot.welcome"));
    }
    const s = await db.query.userSettings.findFirst({
      where: and(eq(schema.userSettings.telegramLinkCode, code), gt(schema.userSettings.telegramLinkExpiresAt, new Date())),
    });
    if (!s) return ctx.reply(guestT(ctx)("bot.linkInvalid"));
    const chatId = String(ctx.chat.id);
    // A chat can belong to one account only.
    await db.update(schema.userSettings).set({ telegramChatId: null }).where(eq(schema.userSettings.telegramChatId, chatId));
    await db
      .update(schema.userSettings)
      .set({
        telegramChatId: chatId,
        telegramUsername: ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name ?? null,
        telegramLinkCode: null,
        telegramLinkExpiresAt: null,
      })
      .where(eq(schema.userSettings.userId, s.userId));
    await ctx.reply(translator(s.locale)("bot.linked", { name: ctx.from?.first_name ?? "empty" }));
  });

  bot.command("help", async (ctx) => {
    const u = await linkedUser(ctx);
    await ctx.reply((u?.t ?? guestT(ctx))(u ? "bot.help" : "bot.welcome"));
  });

  bot.command("km", async (ctx) => {
    const u = await requireLinked(ctx);
    if (!u) return;
    const value = parseMileage(ctx.match ?? "");
    if (value == null) return ctx.reply(u.t("bot.kmUsage"));
    const cars = await listCars(u.settings.userId);
    if (!cars.length) return ctx.reply(u.t("bot.noCars"));
    if (cars.length === 1) return saveKm(ctx, u, cars[0].id, value);
    const kb = new InlineKeyboard();
    for (const c of cars) kb.text(`${carLabel(c)} · ${formatNumber(c.currentOdometer, u.settings.locale)}`, `km:${c.id}:${value}`).row();
    await ctx.reply(u.t("bot.pickCar"), { reply_markup: kb });
  });

  bot.command("cars", async (ctx) => {
    const u = await requireLinked(ctx);
    if (!u) return;
    const cars = await listCars(u.settings.userId);
    if (!cars.length) return ctx.reply(u.t("bot.noCars"));
    const lines = cars.map(
      (c) => `• <b>${escapeHtml(carLabel(c))}</b> — ${formatNumber(c.currentOdometer, u.settings.locale)} ${u.settings.units}`,
    );
    await ctx.reply(`${u.t("bot.carsTitle")}\n\n${lines.join("\n")}`, { parse_mode: "HTML" });
  });

  bot.command("due", async (ctx) => {
    const u = await requireLinked(ctx);
    if (!u) return;
    const cars = await listCars(u.settings.userId);
    if (!cars.length) return ctx.reply(u.t("bot.noCars"));
    const blocks: string[] = [];
    for (const car of cars) {
      const { plans } = await plansWithDue(car);
      const top = plans.filter((p) => p.due.status !== "unknown").slice(0, 4);
      const lines = top.map((p) => {
        const icon = p.due.status === "overdue" ? "🔴" : p.due.status === "soon" ? "🟡" : "🟢";
        const parts: string[] = [];
        if (p.due.kmLeft != null) parts.push(`${formatNumber(p.due.kmLeft, u.settings.locale)} ${u.settings.units}`);
        if (p.due.daysLeft != null) parts.push(u.t("common.days", { count: p.due.daysLeft }));
        return `${icon} ${escapeHtml(p.name)} — ${parts.join(" / ")}`;
      });
      blocks.push(`<b>${escapeHtml(u.t("bot.dueTitle", { car: carLabel(car) }))}</b>\n${lines.join("\n") || u.t("bot.dueNone")}`);
    }
    await ctx.reply(blocks.join("\n\n"), { parse_mode: "HTML" });
  });

  bot.command("visit", async (ctx) => {
    const u = await requireLinked(ctx);
    if (!u) return;
    const visits = await listVisits(u.settings.userId, { activeOnly: true });
    if (!visits.length) return ctx.reply(u.t("bot.visitsNone"));
    for (const v of visits.slice(0, 5)) {
      const text = [
        `${STATUS_EMOJI[v.status]} <b>${escapeHtml(carLabel(v.car))}</b> · ${escapeHtml(v.title)}`,
        `${u.t(`status.${v.status}`)}${v.shopName ? ` · ${escapeHtml(v.shopName)}` : ""}`,
        `${u.t("common.total")}: ${formatMoney(visitTotal(v.workItems), v.currency, u.settings.locale)}`,
      ].join("\n");
      await ctx.reply(text, {
        parse_mode: "HTML",
        reply_markup: new InlineKeyboard().url(u.t("notify.open"), `${appUrl()}/visits/${v.id}`),
      });
    }
  });

  bot.command("lang", async (ctx) => {
    const u = await requireLinked(ctx);
    if (!u) return;
    await ctx.reply("🌐", {
      reply_markup: new InlineKeyboard().text("🇬🇧 English", "lang:en").text("🇺🇦 Українська", "lang:uk"),
    });
  });

  bot.command("log", async (ctx) => {
    const u = await requireLinked(ctx);
    if (!u) return;
    const text = ctx.match?.trim();
    if (!text) return ctx.reply(u.t("bot.help"));
    inBackground(ctx, async () => sendAiResult(ctx, u, await chat(u.settings.userId, u.settings, text)));
  });

  bot.callbackQuery(/^(km|kf):([\w-]+):(\d+)$/, async (ctx) => {
    const u = await linkedUser(ctx);
    await ctx.answerCallbackQuery();
    if (!u) return;
    const [, kind, carId, value] = ctx.match;
    await ctx.editMessageReplyMarkup().catch(() => {});
    await saveKm(ctx, u, carId, Number(value), kind === "kf");
  });

  bot.callbackQuery(/^ap:([\w-]+):([01])$/, async (ctx) => {
    const u = await linkedUser(ctx);
    if (!u) return ctx.answerCallbackQuery();
    const [, eventId, decision] = ctx.match;
    const r = await decideApproval(u.settings.userId, eventId, decision === "1", "bot");
    const msg = r.alreadyDecided ? u.t("bot.alreadyDecided") : r.approved ? u.t("bot.approvedMsg") : u.t("bot.declinedMsg");
    await ctx.answerCallbackQuery({ text: msg });
    await ctx.editMessageReplyMarkup().catch(() => {});
    await ctx.reply(msg);
  });

  bot.callbackQuery(/^lang:(en|uk)$/, async (ctx) => {
    const u = await linkedUser(ctx);
    if (!u) return ctx.answerCallbackQuery();
    const locale = ctx.match[1] as "en" | "uk";
    await db.update(schema.userSettings).set({ locale }).where(eq(schema.userSettings.userId, u.settings.userId));
    const text = translator(locale)("bot.langSet");
    await ctx.answerCallbackQuery({ text });
    await ctx.editMessageText(text).catch(() => {});
  });

  bot.callbackQuery(/^ai:([01])$/, async (ctx) => {
    const u = await linkedUser(ctx);
    if (!u) return ctx.answerCallbackQuery();
    const approved = ctx.match[1] === "1";
    await ctx.answerCallbackQuery({ text: approved ? u.t("bot.done") : u.t("bot.skipped") });
    await ctx.editMessageReplyMarkup().catch(() => {});
    inBackground(ctx, async () => {
      const r = await resolvePending(u.settings.userId, u.settings, approved);
      if (r) await sendAiResult(ctx, u, r);
    });
  });

  bot.on("message:photo", async (ctx) => {
    const u = await requireLinked(ctx);
    if (!u) return;
    if (!(await getUserModel(u.settings.userId))) return ctx.reply(u.t("bot.aiOff"));
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const caption = ctx.message.caption?.trim() || "Here is a receipt/photo. Read it and add the work to my service book if relevant.";
    inBackground(ctx, async () => {
      const file = await ctx.api.getFile(photo.file_id);
      const res = await fetch(`https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`);
      const image = new Uint8Array(await res.arrayBuffer());
      const r = await chat(u.settings.userId, u.settings, [
        { type: "text", text: caption },
        { type: "image", image, mediaType: "image/jpeg" },
      ]);
      await sendAiResult(ctx, u, r);
    });
  });

  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text;
    if (text.startsWith("/")) {
      const u = await linkedUser(ctx);
      return ctx.reply((u?.t ?? guestT(ctx))(u ? "bot.help" : "bot.welcome"));
    }
    const u = await requireLinked(ctx);
    if (!u) return;
    // A bare number is a mileage update — no AI needed.
    const km = parseMileage(text);
    if (km != null && km > 100) {
      const cars = await listCars(u.settings.userId);
      if (cars.length === 1) return saveKm(ctx, u, cars[0].id, km);
    }
    if (!(await getUserModel(u.settings.userId))) return ctx.reply(u.t("bot.aiOff"));
    inBackground(ctx, async () => sendAiResult(ctx, u, await chat(u.settings.userId, u.settings, text)));
  });

  bot.catch(async (err) => {
    console.error("bot error", err.error);
    const u = await linkedUser(err.ctx).catch(() => null);
    await err.ctx.reply((u?.t ?? guestT(err.ctx))("bot.error")).catch(() => {});
  });

  return bot;
}

export const BOT_COMMANDS = {
  en: [
    { command: "km", description: "Update mileage: /km 84500" },
    { command: "due", description: "Upcoming maintenance" },
    { command: "visit", description: "Active shop visits" },
    { command: "cars", description: "Your cars" },
    { command: "lang", description: "Language" },
    { command: "help", description: "Help" },
  ],
  uk: [
    { command: "km", description: "Оновити пробіг: /km 84500" },
    { command: "due", description: "Найближче ТО" },
    { command: "visit", description: "Активні візити на СТО" },
    { command: "cars", description: "Ваші авто" },
    { command: "lang", description: "Мова" },
    { command: "help", description: "Допомога" },
  ],
};
