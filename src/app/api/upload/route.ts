import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/session";
import { hit } from "@/lib/rate-limit";

/**
 * Issues short-lived client tokens so browsers upload straight to Vercel Blob
 * (no file bytes pass through our function). Owners upload with their session;
 * shops upload with the visit share token.
 */
export async function POST(req: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return Response.json({ error: "Blob storage not configured" }, { status: 503 });
  const body = (await req.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const payload = JSON.parse(clientPayload ?? "{}") as { shareToken?: string };
        let actor: string;
        if (payload.shareToken) {
          const visit = await db.query.serviceVisits.findFirst({
            where: eq(schema.serviceVisits.shareToken, payload.shareToken),
          });
          if (!visit?.shareEnabled) throw new Error("Unauthorized");
          actor = `shop:${visit.id}`;
        } else {
          const user = await getCurrentUser();
          if (!user) throw new Error("Unauthorized");
          actor = `user:${user.id}`;
        }
        // Protect the 1 GB / 2k-ops Hobby quota from abuse.
        if (!(await hit(`upload:${actor}`, 40, 60 * 60 * 24))) throw new Error("Upload limit reached");
        return {
          allowedContentTypes: ["image/webp", "image/jpeg", "image/png"],
          maximumSizeInBytes: 1.5 * 1024 * 1024,
          addRandomSuffix: true,
          cacheControlMaxAge: 60 * 60 * 24 * 365,
        };
      },
    });
    return Response.json(json);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
