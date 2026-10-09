import { getLocale, getTimeZone, getTranslations } from "next-intl/server";
import { workshopOverview } from "@/lib/services/licenses";
import { formatDate } from "@/lib/format";
import { Badge, Card } from "@/components/ui/card";

export default async function AdminWorkshopsPage() {
  const rows = await workshopOverview();
  const t = await getTranslations("admin");
  const locale = await getLocale();
  const tz = await getTimeZone();
  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
            <th className="px-4 py-3">{t("workshop")}</th>
            <th className="px-4 py-3">{t("plan")}</th>
            <th className="px-4 py-3">{t("expires")}</th>
            <th className="px-4 py-3">{t("members")}</th>
            <th className="px-4 py-3">{t("jobsMonth")}</th>
            <th className="px-4 py-3">{t("created")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ workshop: w, entitlements: e, members, jobsThisMonth }) => (
            <tr key={w.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3">
                <div className="font-semibold">{w.name}</div>
                <div className="text-xs text-muted">{[w.city, w.phone].filter(Boolean).join(" · ")}</div>
              </td>
              <td className="px-4 py-3">
                <Badge tone={e.plan === "pro" ? "success" : "neutral"}>{e.plan === "pro" ? `Pro · ${e.seats}` : "Free"}</Badge>
              </td>
              <td className="tabular px-4 py-3">{e.expiresAt ? formatDate(e.expiresAt, locale, undefined, tz) : "—"}</td>
              <td className="tabular px-4 py-3">{members}</td>
              <td className="tabular px-4 py-3">{jobsThisMonth}</td>
              <td className="tabular px-4 py-3">{formatDate(w.createdAt, locale, undefined, tz)}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-muted">
                {t("noWorkshops")}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  );
}
