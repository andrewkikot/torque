"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { SendHorizonal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhotoButton } from "@/components/photo-upload";

/** Note + photo composer for the visit timeline (owner or shop). */
export function Composer({
  onPost,
  shareToken,
}: {
  onPost: (message: string, photoUrl: string | null) => Promise<{ ok: true } | { ok: false; error: string }>;
  shareToken?: string;
}) {
  const t = useTranslations("visit");
  const router = useRouter();
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function post() {
    if (!text.trim() && !photo) return;
    setBusy(true);
    const r = await onPost(text, photo);
    setBusy(false);
    if (!r.ok) return toast.error(r.error);
    setText("");
    setPhoto(null);
    router.refresh();
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-2 shadow-card focus-within:border-accent">
      {photo && (
        <div className="relative m-2 inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="" className="h-24 rounded-2xl object-cover" />
          <button onClick={() => setPhoto(null)} className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-fg text-bg" aria-label="Remove">
            <X className="size-3" />
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <PhotoButton variant="icon" folder="visits" shareToken={shareToken} onUploaded={setPhoto} label={t("addPhoto")} />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) post();
          }}
          placeholder={t("notePlaceholder")}
          rows={1}
          className="max-h-40 min-h-10 flex-1 resize-none bg-transparent focus-visible:outline-none px-2 py-2 text-[15px] outline-none placeholder:text-subtle field-sizing-content"
        />
        <Button size="icon" onClick={post} loading={busy} disabled={!text.trim() && !photo} aria-label={t("post")}>
          {!busy && <SendHorizonal />}
        </Button>
      </div>
    </div>
  );
}
