import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { getLocale, getTimeZone, getTranslations } from "next-intl/server";
import { Sparkles, ChevronRight } from "lucide-react";
import { ShowToMechanic } from "@/components/car/show-to-mechanic";
import { appUrl } from "@/lib/app-url";
import { db, schema } from "@/db";
import { loadCar } from "@/lib/page-data";
import { plansWithDue } from "@/lib/services/maintenance";
import { listHistory, historyStats } from "@/lib/services/work";
import { listVisits, visitTotal } from "@/lib/services/visits";
import { Card, SectionTitle, Badge } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { AddWorkButton } from "@/components/work/add-work-button";
import { HistoryList } from "@/components/work/history-list";
import { DueText, dueTone } from "@/components/car/due-text";
import { CATEGORY_EMOJI } from "@/components/work/categories";
import { VisitProgress } from "@/components/visit/visit-progress";
import { formatDate, formatMoney } from "@/lib/format";

function QuickLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex flex-col items-center justify-center gap-1.5 rounded-3xl border border-border bg-card px-2 py-3 text-center text-xs font-semibold shadow-card active:scale-[0.97]">
      <span className="grid size-10 place-items-center rounded-2xl bg-accent-soft text-accent">{icon}</span>
      <span className="line-clamp-2 leading-tight">{label}</span>
    </Link>
  );
}

export default async function CarOverview({ params }: PageProps<"/cars/[id]">) {
  const { id } = await params;
  const { user, car, settings } = await loadCar(id);
  const [{ plans }, history, stats, active, planOptions] = await Promise.all([
    plansWithDue(car),
    listHistory(user.id, car.id),
    historyStats(user.id, car.id),
    listVisits(user.id, { carId: car.id, activeOnly: true }),
    db.query.maintenancePlans.findMany({
      where: and(eq(schema.maintenancePlans.carId, car.id), eq(schema.maintenancePlans.active, true)),
      columns: { id: true, name: true },
    }),
  ]);
  const t = await getTranslations();
  const locale = await getLocale();
  const tz = await getTimeZone();
  const upcoming = plans.filter((p) => p.due.status !== "unknown").slice(0, 4);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-3 gap-2 lg:hidden">
          <AddWorkButton carId={car.id} currency={settings.currency} units={settings.units} odometer={car.currentOdometer} plans={planOptions} compact />
          <ShowToMechanic carId={car.id} appUrl={appUrl()} />
          <QuickLink href={`/assistant?carId=${car.id}`} icon={<Sparkles className="size-5" />} label={t("assistant.title")} />
        </div>
        {active.map((v) => (
          <Link key={v.id} href={`/visits/${v.id}`} className="block">
            <Card className="border-accent/40 bg-gradient-to-br from-accent-soft to-card transition hover:-translate-y-0.5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-bold uppercase tracking-wider text-accent">{t("garage.activeVisits")}</div>
                  <div className="mt-0.5 line-clamp-2 text-lg font-bold leading-snug">{v.title}</div>
                  <div className="text-sm text-muted">
                    {(v.workshop?.name ?? v.shopName) && <>{v.workshop?.name ?? v.shopName} · </>}
                    <span className="tabular font-semibold text-fg">{formatMoney(visitTotal(v.workItems), v.currency, locale)}</span>
                  </div>
                </div>
                <ChevronRight className="mt-5 size-5 shrink-0 text-muted" />
              </div>
              <VisitProgress status={v.status} compact />
            </Card>
          </Link>
        ))}

        <section>
          <SectionTitle action={<Link href={`/cars/${car.id}/maintenance`} className="text-sm font-semibold text-accent">{t("car.seeAll")}</Link>}>
            {t("car.upcoming")}
          </SectionTitle>
          {upcoming.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {upcoming.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-3xl border border-border bg-card p-4 shadow-card">
                  <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-soft text-lg">{CATEGORY_EMOJI[p.category]}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{p.name}</div>
                    <div className="truncate text-sm text-muted">
                      <DueText due={p.due} units={settings.units} />
                    </div>
                  </div>
                  <Badge tone={dueTone(p.due.status)}>{t(`maintenance.${p.due.status}`)}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">{t("garage.noPlans")}</p>
          )}
        </section>

        <section>
          <SectionTitle action={<Link href={`/cars/${car.id}/history`} className="text-sm font-semibold text-accent">{t("car.seeAll")}</Link>}>
            {t("car.recentWork")}
          </SectionTitle>
          {history.length ? (
            <HistoryList items={history.slice(0, 5)} units={settings.units} carId={car.id} readOnly />
          ) : (
            <p className="text-sm text-muted">{t("car.noWork")}</p>
          )}
        </section>
      </div>

      <aside className="flex flex-col gap-4">
        <Card className="hidden flex-col gap-2 lg:flex">
          <AddWorkButton carId={car.id} currency={settings.currency} units={settings.units} odometer={car.currentOdometer} plans={planOptions} />
          <ShowToMechanic carId={car.id} appUrl={appUrl()} variant="button" />
          <ButtonLink href={`/assistant?carId=${car.id}`} variant="secondary">
            <Sparkles /> {t("assistant.title")}
          </ButtonLink>
        </Card>
        <Card>
          <div className="text-sm text-muted">{t("car.spent")}</div>
          <div className="tabular font-display text-2xl font-bold">{formatMoney(stats.total, settings.currency, locale)}</div>
          <div className="text-sm text-muted">{t("history.entries", { count: stats.count })}</div>
        </Card>
        {(car.vin || car.plate || car.engine || car.purchaseDate || car.transmission) && (
          <Card>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              {car.vin && (
                <>
                  <dt className="text-muted">{t("car.vin")}</dt>
                  <dd className="truncate font-mono text-xs leading-5">{car.vin}</dd>
                </>
              )}
              {car.plate && (
                <>
                  <dt className="text-muted">{t("car.plate")}</dt>
                  <dd>{car.plate}</dd>
                </>
              )}
              {car.engine && (
                <>
                  <dt className="text-muted">{t("car.engine")}</dt>
                  <dd>{car.engine}</dd>
                </>
              )}
              <dt className="text-muted">{t("wizard.fuel")}</dt>
              <dd>
                {t(`fuel.${car.fuel}`)}
                {car.transmission && ` · ${t(`transmission.${car.transmission}`)}`}
              </dd>
              {car.purchaseDate && (
                <>
                  <dt className="text-muted">{t("wizard.purchaseDate")}</dt>
                  <dd>{formatDate(car.purchaseDate, locale, undefined, tz)}</dd>
                </>
              )}
            </dl>
          </Card>
        )}
      </aside>
    </div>
  );
}
