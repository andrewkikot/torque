import Link from "next/link";
import { getLocale, getTimeZone, getTranslations } from "next-intl/server";
import { listLicenses } from "@/lib/services/licenses";
import { billingEnabled } from "@/lib/plans";
import { formatDate } from "@/lib/format";
import { Badge, Card } from "@/components/ui/card";
import { GenerateForm } from "@/components/admin/generate-form";
import { RevokeButton } from "@/components/admin/revoke-button";
import { cn } from "@/lib/utils";

const STATUSES = ["all", "new", "active", "revoked"] as const;

export default async function AdminLicensesPage({ searchParams }: PageProps<"/admin">) {
  const sp = await searchParams;
  const status = (STATUSES as readonly string[]).includes(String(sp.s)) && sp.s !== "all" ? (sp.s as "new" | "active" | "revoked") : undefined;
  const rows = await listLicenses({ status });
  const t = await getTranslations("admin");
  const locale = await getLocale();
  const tz = await getTimeZone();
  const now = new Date();

  return (
    <div className="flex flex-col gap-5">
      {!billingEnabled() && <p className="rounded-2xl bg-warning/10 px-4 py-3 text-sm font-medium text-warning">{t("billingOff")}</p>}
      <GenerateForm />
      <div className="flex gap-2">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={s === "all" ? "/admin" : `/admin?s=${s}`}
            className={cn("rounded-full px-3 py-1.5 text-sm font-semibold", (status ?? "all") === s ? "bg-fg text-bg" : "bg-card text-muted shadow-card")}
          >
            {t(`status.${s}`)}
          </Link>
        ))}
      </div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
              <th className="px-4 py-3">{t("key")}</th>
              <th className="px-4 py-3">{t("statusCol")}</th>
              <th className="px-4 py-3">{t("plan")}</th>
              <th className="px-4 py-3">{t("workshop")}</th>
              <th className="px-4 py-3">{t("expires")}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ license: l, workshopName }) => {
              const expired = l.status === "active" && l.expiresAt && l.expiresAt < now;
              return (
                <tr key={l.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-mono font-semibold">…{l.keyHint}</div>
                    {l.note && <div className="max-w-56 truncate text-xs text-muted">{l.note}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={l.status === "revoked" ? "danger" : expired ? "warning" : l.status === "active" ? "success" : "neutral"}>
                      {expired ? t("status.expired") : t(`status.${l.status}`)}
                    </Badge>
                  </td>
                  <td className="tabular px-4 py-3">{t("planCell", { seats: l.seats, months: Math.round(l.durationDays / 30.44) })}</td>
                  <td className="px-4 py-3">{workshopName ?? "—"}</td>
                  <td className="tabular px-4 py-3">{l.expiresAt ? formatDate(l.expiresAt, locale, undefined, tz) : "—"}</td>
                  <td className="px-4 py-3 text-right">{l.status !== "revoked" && <RevokeButton id={l.id} />}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  {t("empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
