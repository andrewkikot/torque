import { webhookCallback } from "grammy";
import { createBot } from "@/lib/bot/bot";

export const maxDuration = 60;

let handler: ((req: Request) => Promise<Response>) | null = null;

export async function POST(req: Request) {
  if (!process.env.TELEGRAM_BOT_TOKEN) return new Response("bot not configured", { status: 503 });
  handler ??= webhookCallback(createBot(), "std/http", {
    secretToken: process.env.TELEGRAM_WEBHOOK_SECRET,
    // Slow AI work is deferred with after(), so commands answer quickly.
    timeoutMilliseconds: 25_000,
    onTimeout: "return",
  });
  return handler(req);
}
