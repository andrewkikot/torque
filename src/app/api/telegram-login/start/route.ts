import { startTelegramLogin } from "@/lib/services/telegram-login";
import { hit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_BOT_USERNAME) {
    return Response.json({ error: "Telegram sign-in is not configured" }, { status: 503 });
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!(await hit(`tglogin:${ip}`, 10, 60 * 10))) return Response.json({ error: "Too many attempts" }, { status: 429 });
  return Response.json(await startTelegramLogin(req.headers.get("user-agent")));
}
