import { pollLogin } from "@/lib/services/telegram-login";
import { safeNext } from "@/lib/safe-next";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id || id.length > 64) return Response.json({ status: "expired" });
  return Response.json(await pollLogin(id, req.headers, safeNext(url.searchParams.get("next"))), { headers: { "cache-control": "no-store" } });
}
