"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";
import { compressImage } from "@/lib/image";
import { cn } from "@/lib/utils";

export function usePhotoUpload(opts: { folder: string; shareToken?: string }) {
  const t = useTranslations("wizard");
  const [uploading, setUploading] = useState(false);

  async function uploadFile(file: File): Promise<string | null> {
    setUploading(true);
    try {
      const blob = await compressImage(file);
      const ext = blob.type === "image/webp" ? "webp" : "jpg";
      const res = await upload(`${opts.folder}/photo.${ext}`, blob, {
        access: "public",
        handleUploadUrl: "/api/upload",
        contentType: blob.type,
        clientPayload: JSON.stringify({ shareToken: opts.shareToken }),
      });
      return res.url;
    } catch (e) {
      const msg = (e as Error).message ?? "";
      toast.error(/not configured|503/i.test(msg) ? t("uploadUnavailable") : msg || "Upload failed");
      return null;
    } finally {
      setUploading(false);
    }
  }
  return { uploading, uploadFile };
}

export function PhotoButton({
  onUploaded,
  folder,
  shareToken,
  label,
  className,
  variant = "pill",
}: {
  onUploaded: (url: string) => void;
  folder: string;
  shareToken?: string;
  label?: string;
  className?: string;
  variant?: "pill" | "icon";
}) {
  const ref = useRef<HTMLInputElement>(null);
  const { uploading, uploadFile } = usePhotoUpload({ folder, shareToken });
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          const url = await uploadFile(f);
          if (url) onUploaded(url);
        }}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={uploading}
        className={cn(
          variant === "pill"
            ? "inline-flex h-10 items-center gap-2 rounded-2xl bg-soft px-4 text-sm font-semibold hover:bg-border"
            : "grid size-10 place-items-center rounded-2xl bg-soft hover:bg-border",
          className,
        )}
        aria-label={label}
      >
        {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
        {variant === "pill" && label}
      </button>
    </>
  );
}
