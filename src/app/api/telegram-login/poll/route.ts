import { pollLogin } from "@/lib/services/telegram-login";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id || id.length > 64) return Response.json({ status: "expired" });
  return Response.json(await pollLogin(id, req.headers), { headers: { "cache-control": "no-store" } });
}
