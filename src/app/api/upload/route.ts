import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getCurrentUser } from "@/lib/session";
import { hit } from "@/lib/rate-limit";

/**
 * Issues short-lived client tokens so browsers upload straight to Vercel Blob
 * (no file bytes pass through our function).
 */
export async function POST(req: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return Response.json({ error: "Blob storage not configured" }, { status: 503 });
  const body = (await req.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => {
        // Only signed-in users upload (owners: car photos & receipts; mechanics: job photos).
        const user = await getCurrentUser();
        if (!user) throw new Error("Unauthorized");
        const actor = `user:${user.id}`;
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
