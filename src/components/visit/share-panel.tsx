"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Copy, Link2, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { sharingAction } from "@/app/actions/visits";

export function SharePanel({ visitId, token, enabled, appUrl, title }: { visitId: string; token: string; enabled: boolean; appUrl: string; title: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const url = `${appUrl}/v/${token}`;

  const update = async (opts: { enabled?: boolean; regenerate?: boolean }) => {
    setBusy(true);
    const r = await sharingAction(visitId, opts);
    setBusy(false);
    if (!r.ok) return toast.error(r.error);
    router.refresh();
  };

  return (
    <Card>
      <div className="mb-1 flex items-center gap-2">
        <Link2 className="size-4 text-accent" />
        <h3 className="font-display font-semibold">{t("visit.shareTitle")}</h3>
      </div>
      <p className="mb-3 text-sm text-muted">{t("visit.shareSub")}</p>
      {enabled ? (
        <>
          <div className="mb-3 truncate rounded-2xl bg-soft px-3 py-2.5 font-mono text-xs">{url}</div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={async () => {
                if (navigator.share) {
                  await navigator.share({ title, url }).catch(() => {});
                } else {
                  await navigator.clipboard.writeText(url);
                  toast.success(t("common.copied"));
                }
              }}
            >
              <Send /> {t("common.share")}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(url);
                toast.success(t("common.copied"));
              }}
            >
              <Copy /> {t("common.copy")}
            </Button>
            <Button size="sm" variant="ghost" loading={busy} onClick={() => update({ regenerate: true })}>
              <RefreshCw /> {t("visit.regenerate")}
            </Button>
            <Button size="sm" variant="danger-ghost" disabled={busy} onClick={() => update({ enabled: false })}>
              {t("visit.disableShare")}
            </Button>
          </div>
        </>
      ) : (
        <Button size="sm" variant="secondary" loading={busy} onClick={() => update({ enabled: true })}>
          {t("visit.enableShare")}
        </Button>
      )}
    </Card>
  );
}
