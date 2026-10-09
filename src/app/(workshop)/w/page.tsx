import Link from "next/link";
import { getLocale, getTimeZone, getTranslations } from "next-intl/server";
import { Plus, Search, Clock, ChevronRight } from "lucide-react";
import { requireWorkshop } from "@/lib/workshop-context";
import { listWorkshopBoard, vehicleLabel, visitTotal, type BoardFilter } from "@/lib/services/visits";
import { planStatus } from "@/lib/services/licenses";
import { STATUS_EMOJI } from "@/lib/domain/visit-status";
import { formatDateTime, formatMoney } from "@/lib/format";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { AutoRefresh } from "@/components/visit/auto-refresh";
import { cn } from "@/lib/utils";

export const metadata = { title: "Workshop" };

const FILTERS: BoardFilter[] = ["active", "waiting", "ready", "done"];

export default async function BoardPage({ searchParams }: PageProps<"/w">) {
  const sp = await searchParams;
  const filter = (FILTERS as string[]).includes(String(sp.f)) ? (sp.f as BoardFilter) : "active";
  const q = typeof sp.q === "string" ? sp.q : "";
  const { user, workshop } = await requireWorkshop();
  const [jobs, plan] = await Promise.all([listWorkshopBoard(user.id, workshop.id, { filter, q }), planStatus(user.id, workshop.id)]);
  const e = plan.entitlements;
  const nearLimit = e.jobsPerMonth != null && plan.usage.jobs >= Math.floor(e.jobsPerMonth * 0.8);
  const proDaysLeft = e.plan === "pro" && e.expiresAt ? Math.ceil((e.expiresAt.getTime() - Date.now()) / 86_400_000) : null;
  const t = await getTranslations();
  const locale = await getLocale();
  const tz = await getTimeZone();

  return (
    <>
      <AutoRefresh intervalMs={30_000} />
      <PageHeader
        title={workshop.name}
        sub={e.plan === "pro" && e.expiresAt ? `${t("workshop.boardSub")} · Pro` : t("workshop.boardSub")}
        action={
          <ButtonLink href="/w/new" className="hidden sm:inline-flex">
            <Plus /> {t("workshop.nav.newJob")}
          </ButtonLink>
        }
      />
      {(nearLimit || (proDaysLeft != null && proDaysLeft <= 14)) && (
        <Link
          href="/w/settings#plan"
          className={cn(
            "mb-4 flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-semibold",
            nearLimit && plan.usage.jobs >= (e.jobsPerMonth ?? 0) ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning",
          )}
        >
          <span>
            {nearLimit
              ? t("plan.bannerJobs", { used: plan.usage.jobs, limit: e.jobsPerMonth ?? 0 })
              : t("plan.bannerExpiring", { count: proDaysLeft ?? 0 })}
          </span>
          <span className="shrink-0 underline underline-offset-2">{nearLimit ? t("plan.upgrade") : t("plan.renew")}</span>
        </Link>
      )}
      <form className="relative mb-3" action="/w">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
        {filter !== "active" && <input type="hidden" name="f" value={filter} />}
        <input
          id="board-search"
          name="q"
          defaultValue={q}
          placeholder={t("workshop.search")}
          className="h-12 w-full rounded-2xl border border-border bg-card pl-11 pr-4 text-base outline-none transition-[border-color,box-shadow] focus:border-accent focus:ring-4 focus:ring-accent-soft sm:text-[15px]"
        />
      </form>
      <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={`/w?f=${f}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition",
              f === filter ? "bg-fg text-bg" : "bg-card text-muted shadow-card hover:text-fg",
            )}
          >
            {t(`workshop.filter.${f}`)}
          </Link>
        ))}
      </div>

      {jobs.length === 0 ? (
        <EmptyState
          icon="🧰"
          title={q ? t("workshop.noResults") : t("workshop.emptyTitle")}
          sub={q ? undefined : t("workshop.emptySub")}
          action={
            !q && (
              <ButtonLink href="/w/new">
                <Plus /> {t("workshop.nav.newJob")}
              </ButtonLink>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {jobs.map((j) => (
            <Link
              key={j.id}
              href={`/w/jobs/${j.id}`}
              className="flex items-center gap-3 rounded-3xl border border-border bg-card p-4 shadow-card transition active:scale-[0.99] hover:-translate-y-0.5"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-soft text-2xl">{STATUS_EMOJI[j.status]}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate font-bold">{vehicleLabel(j)}</span>
                  {j.vehiclePlate && <span className="shrink-0 rounded-md bg-soft px-1.5 py-0.5 font-mono text-[11px] font-bold">{j.vehiclePlate}</span>}
                </span>
                <span className="block truncate text-sm">{j.title}</span>
                <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                  <span className="font-semibold text-accent">{t(`status.${j.status}`)}</span>
                  {j.customerName && <span>· {j.customerName}</span>}
                  {!j.carId && <span>· {t("workshop.walkIn")}</span>}
                  {j.eta && !["completed", "cancelled"].includes(j.status) && (
                    <span className="inline-flex items-center gap-1">
                      · <Clock className="size-3" /> {formatDateTime(j.eta, locale, tz)}
                    </span>
                  )}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <span className="tabular text-sm font-bold">{formatMoney(visitTotal(j.workItems), j.currency, locale)}</span>
                <ChevronRight className="size-4 text-muted" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
