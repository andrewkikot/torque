import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { BadgeCheck, Sparkles, Check } from "lucide-react";
import { Card, Badge } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { FREE, PRO_DEFAULT_SEATS, type Entitlements } from "@/lib/plans";
import { cn } from "@/lib/utils";
import { ActivateKeyForm } from "./activate-key";

function Usage({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = Math.min(100, Math.round((used / limit) * 100));
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className="tabular font-semibold">
          {used} / {limit}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-soft">
        <div className={cn("h-full rounded-full", pct >= 100 ? "bg-danger" : pct >= 80 ? "bg-warning" : "bg-accent")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Workshop plan: what you have, what you use, and how to get Pro. */
export function PlanCard({
  entitlements: e,
  usage,
  billing,
  isOwner,
  salesContact,
}: {
  entitlements: Entitlements;
  usage: { jobs: number; seats: number };
  billing: boolean;
  isOwner: boolean;
  salesContact: string | null;
}) {
  const t = useTranslations("plan");
  const locale = useLocale();
  const tz = useTimeZone();
  const pro = e.plan === "pro";
  const daysLeft = e.expiresAt ? Math.max(0, Math.ceil((new Date(e.expiresAt).getTime() - Date.now()) / 86_400_000)) : null;
  const contactUrl = salesContact?.startsWith("@") ? `https://t.me/${salesContact.slice(1)}` : null;

  return (
    <Card id="plan" className="flex scroll-mt-6 flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={cn("grid size-9 place-items-center rounded-xl", pro ? "bg-accent text-accent-fg" : "bg-soft")}>
            {pro ? <BadgeCheck className="size-5" /> : <Sparkles className="size-5" />}
          </span>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted">{t("title")}</div>
            <div className="font-display text-lg font-bold">{pro ? "Pro" : billing ? "Free" : t("beta")}</div>
          </div>
        </div>
        {pro && daysLeft != null && <Badge tone={daysLeft <= 7 ? "warning" : "success"}>{t("daysLeft", { count: daysLeft })}</Badge>}
      </div>

      {pro && e.expiresAt && (
        <p className="text-sm text-muted">
          {t("proUntil", { date: formatDate(e.expiresAt, locale, undefined, tz), seats: e.seats })}
        </p>
      )}
      {!billing && !pro && <p className="text-sm text-muted">{t("betaSub")}</p>}

      {billing && (
        <div className="flex flex-col gap-3">
          {e.jobsPerMonth != null && <Usage label={t("jobsThisMonth")} used={usage.jobs} limit={e.jobsPerMonth} />}
          <Usage label={t("team")} used={usage.seats} limit={e.seats} />
          <div className="flex justify-between text-sm">
            <span className="text-muted">{t("photos")}</span>
            <span className="font-semibold">{t("photosPerJob", { count: e.photosPerJob })}</span>
          </div>
        </div>
      )}

      {!pro && billing && (
        <div className="rounded-2xl bg-soft p-4">
          <div className="mb-2 text-sm font-bold">{t("proIncludes")}</div>
          <ul className="flex flex-col gap-1.5 text-sm">
            {(["unlimitedJobs", "moreSeats", "morePhotos", "branding", "teamTelegram"] as const).map((k) => (
              <li key={k} className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-success" /> {t(`features.${k}`, { seats: PRO_DEFAULT_SEATS, free: FREE.jobsPerMonth ?? 0 })}
              </li>
            ))}
          </ul>
          {salesContact && (
            <p className="mt-3 text-sm">
              {t("howToBuy")}{" "}
              {contactUrl ? (
                <a href={contactUrl} target="_blank" rel="noreferrer" className="font-bold text-accent">
                  {salesContact}
                </a>
              ) : (
                <span className="select-all font-bold">{salesContact}</span>
              )}
            </p>
          )}
        </div>
      )}

      {isOwner ? <ActivateKeyForm renew={pro} /> : <p className="text-xs text-muted">{t("ownerOnly")}</p>}
    </Card>
  );
}
