import { runDailyReminders } from "@/lib/reminders";
import { isAuthorizedCron } from "@/lib/cron-auth";

// Vercel Hobby allows one run per day — see vercel.json.
export const maxDuration = 300;

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return new Response("unauthorized", { status: 401 });
  const stats = await runDailyReminders();
  return Response.json({ ok: true, ...stats });
}
