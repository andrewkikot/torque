"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Copy, Link2, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { jobSharingAction } from "@/app/actions/workshop";

/** Workshop side: the customer's read-only tracking link. */
export function TrackingLinkPanel({
  visitId,
  token,
  enabled,
  appUrl,
  title,
  linked,
}: {
  visitId: string;
  token: string;
  enabled: boolean;
  appUrl: string;
  title: string;
  /** Already attached to a Torque garage: the owner gets updates in the app. */
  linked: boolean;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const url = `${appUrl}/v/${token}`;

  const update = async (opts: { enabled?: boolean; regenerate?: boolean }) => {
    setBusy(true);
    const r = await jobSharingAction(visitId, opts);
    setBusy(false);
    if (!r.ok) return toast.error(r.error);
    router.refresh();
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("common.copied"));
    } catch {
      toast(url);
    }
  };

  return (
    <Card>
      <div className="mb-1 flex items-center gap-2">
        <Link2 className="size-4 text-accent" />
        <h3 className="font-display font-semibold">{t("workshop.trackingTitle")}</h3>
      </div>
      <p className="mb-3 text-sm text-muted">{linked ? t("workshop.trackingLinked") : t("workshop.trackingSub")}</p>
      {enabled ? (
        <>
          <div className="mb-3 truncate rounded-2xl bg-soft px-3 py-2.5 font-mono text-xs">{url}</div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={async () => {
                if (navigator.share) await navigator.share({ title, url }).catch(() => {});
                else await copy();
              }}
            >
              <Send /> {t("common.share")}
            </Button>
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-2 rounded-xl bg-sky-500 px-3 text-sm font-semibold text-white"
            >
              Telegram
            </a>
            <Button size="sm" variant="secondary" onClick={copy}>
              <Copy /> {t("common.copy")}
            </Button>
            <Button size="sm" variant="ghost" loading={busy} onClick={() => update({ regenerate: true })}>
              <RefreshCw /> {t("visit.regenerate")}
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
