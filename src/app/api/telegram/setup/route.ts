import { createBot, BOT_COMMANDS } from "@/lib/bot/bot";
import { isAuthorizedCron } from "@/lib/cron-auth";

/**
 * One-time setup: registers the webhook and command menu.
 * Call: curl -H "Authorization: Bearer $CRON_SECRET" https://your-app.vercel.app/api/telegram/setup
 */
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return new Response("unauthorized", { status: 401 });
  const bot = createBot();
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/telegram`;
  await bot.api.setWebhook(url, {
    secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  });
  await bot.api.setMyCommands(BOT_COMMANDS.en);
  await bot.api.setMyCommands(BOT_COMMANDS.uk, { language_code: "uk" });
  const info = await bot.api.getWebhookInfo();
  const me = await bot.api.getMe();
  return Response.json({ ok: true, bot: me.username, webhook: info });
}
