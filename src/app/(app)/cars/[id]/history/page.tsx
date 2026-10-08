import { getLocale, getTranslations } from "next-intl/server";
import { Printer } from "lucide-react";
import { loadCar } from "@/lib/page-data";
import { listHistory, historyStats, historyYears } from "@/lib/services/work";
import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { HistoryList } from "@/components/work/history-list";
import { HistoryFilters } from "@/components/work/history-filters";
import { SpendChart } from "@/components/work/spend-chart";
import { AddWorkButton } from "@/components/work/add-work-button";
import { Card, EmptyState } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { workCategoryEnum, type WorkCategory } from "@/db/schema";

export default async function HistoryPage({ params, searchParams }: PageProps<"/cars/[id]/history">) {
  const { id } = await params;
  const sp = await searchParams;
  const { user, car, settings } = await loadCar(id);
  const category = (workCategoryEnum.enumValues as readonly string[]).includes(String(sp.category)) ? (sp.category as WorkCategory) : undefined;
  const year = sp.year ? Number(sp.year) : undefined;
  const [items, stats, years, plans] = await Promise.all([
    listHistory(user.id, car.id, { category, year }),
    historyStats(user.id, car.id),
    historyYears(user.id, car.id),
    db.query.maintenancePlans.findMany({
      where: and(eq(schema.maintenancePlans.carId, car.id), eq(schema.maintenancePlans.active, true)),
      columns: { id: true, name: true },
    }),
  ]);
  const t = await getTranslations();
  const locale = await getLocale();

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <HistoryFilters years={years} />
          <AddWorkButton carId={car.id} currency={settings.currency} units={settings.units} odometer={car.currentOdometer} plans={plans} />
        </div>
        {items.length ? (
          <HistoryList items={items} units={settings.units} carId={car.id} />
        ) : (
          <EmptyState icon="📒" title={t("history.empty")} sub={t("history.emptySub")} />
        )}
      </div>
      <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
        <Card>
          <div className="text-sm text-muted">{t("history.totalSpent")}</div>
          <div className="tabular font-display text-3xl font-bold">{formatMoney(stats.total, settings.currency, locale)}</div>
          <div className="mt-1 text-sm text-muted">
            {t("history.entries", { count: stats.count })}
            {stats.costPerKm != null && (
              <>
                {" · "}
                {t("car.costPerKm", { units: settings.units })}: {formatMoney(stats.costPerKm, settings.currency, locale)}
              </>
            )}
          </div>
        </Card>
        {stats.byCategory.length > 0 && (
          <Card>
            <SpendChart data={stats.byCategory} currency={settings.currency} />
          </Card>
        )}
        <ButtonLink href={`/print/${car.id}`} variant="outline" target="_blank">
          <Printer /> {t("history.export")}
        </ButtonLink>
      </aside>
    </div>
  );
}
