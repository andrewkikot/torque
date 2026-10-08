"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Copy, Send, UserMinus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Badge } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm";
import { acceptInviteAction, inviteLinkAction, removeMemberAction, switchWorkshopAction } from "@/app/actions/workshop";

type Member = { userId: string; role: "owner" | "mechanic"; name: string; email: string; telegram: string | null; joinedAt: string };

export function TeamCard({ me, isOwner, members, appUrl }: { me: string; isOwner: boolean; members: Member[]; appUrl: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const shown = (m: Member) => (m.email.endsWith("@users.torque.local") ? (m.telegram ?? "Telegram") : m.email);

  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <Users className="size-4 text-accent" />
        <h2 className="font-display text-lg font-semibold">{t("workshop.team")}</h2>
      </div>
      <ul className="mb-4 flex flex-col divide-y divide-border">
        {members.map((m) => (
          <li key={m.userId} className="flex items-center gap-3 py-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-soft text-sm font-bold">{(m.name || "?").slice(0, 1).toUpperCase()}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">
                {m.name} {m.userId === me && <span className="font-normal text-muted">· {t("visit.by.you")}</span>}
              </span>
              <span className="block truncate text-xs text-muted">{shown(m)}</span>
            </span>
            <Badge tone={m.role === "owner" ? "accent" : "neutral"}>{t(`workshop.role.${m.role}`)}</Badge>
            {(isOwner || m.userId === me) && (
              <ConfirmButton
                size="sm"
                variant="ghost"
                className="size-8 px-0 text-muted"
                confirmLabel={m.userId === me ? t("workshop.leave") : t("workshop.remove")}
                onConfirm={async () => {
                  const r = await removeMemberAction(m.userId);
                  if (!r.ok) return toast.error(r.error);
                  if (m.userId === me) router.push("/garage");
                  else router.refresh();
                }}
              >
                <UserMinus />
              </ConfirmButton>
            )}
          </li>
        ))}
      </ul>
      {isOwner && (
        <div className="rounded-2xl bg-soft p-4">
          <div className="mb-1 text-sm font-bold">{t("workshop.inviteTitle")}</div>
          <p className="mb-3 text-sm text-muted">{t("workshop.inviteSub")}</p>
          {link ? (
            <>
              <div className="mb-3 truncate rounded-xl bg-card px-3 py-2 font-mono text-xs">{link}</div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={async () => {
                    if (navigator.share) await navigator.share({ url: link }).catch(() => {});
                    else {
                      await navigator.clipboard.writeText(link).catch(() => {});
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
                    await navigator.clipboard.writeText(link).catch(() => {});
                    toast.success(t("common.copied"));
                  }}
                >
                  <Copy /> {t("common.copy")}
                </Button>
              </div>
            </>
          ) : (
            <Button
              size="sm"
              loading={busy}
              onClick={async () => {
                setBusy(true);
                const r = await inviteLinkAction();
                setBusy(false);
                if (!r.ok) return toast.error(r.error);
                setLink(`${appUrl}/w/join/${r.data.token}`);
              }}
            >
              {t("workshop.inviteButton")}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

export function JoinButton({ token }: { token: string }) {
  const t = useTranslations("workshop");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="lg"
      className="mt-2"
      loading={busy}
      onClick={async () => {
        setBusy(true);
        const r = await acceptInviteAction(token);
        setBusy(false);
        if (!r.ok) return toast.error(r.error);
        router.replace("/w");
        router.refresh();
      }}
    >
      {t("joinButton")}
    </Button>
  );
}

export function WorkshopSwitcher({ current, all }: { current: string; all: { id: string; name: string }[] }) {
  const t = useTranslations("workshop");
  const router = useRouter();
  return (
    <Card className="flex flex-col gap-2">
      <div className="text-sm font-bold">{t("switch")}</div>
      <div className="flex flex-wrap gap-2">
        {all.map((w) => (
          <Button
            key={w.id}
            size="sm"
            variant={w.id === current ? "primary" : "secondary"}
            onClick={async () => {
              await switchWorkshopAction(w.id);
              router.refresh();
            }}
          >
            {w.name}
          </Button>
        ))}
      </div>
    </Card>
  );
}
