import { getTranslations } from "next-intl/server";
import { loadCar } from "@/lib/page-data";
import { plansWithDue } from "@/lib/services/maintenance";
import { PlanCard, type PlanView } from "@/components/maintenance/plan-card";
import { AddPlanButton, AddPresetsButton } from "@/components/maintenance/add-plan-button";
import { DueText } from "@/components/car/due-text";
import { EmptyState } from "@/components/ui/card";
import { HealthRing } from "@/components/car/health-ring";

export default async function MaintenancePage({ params }: PageProps<"/cars/[id]/maintenance">) {
  const { id } = await params;
  const { car, settings } = await loadCar(id);
  const { plans, dailyDistance, health } = await plansWithDue(car);
  const t = await getTranslations();

  const toView = (p: (typeof plans)[number]): PlanView => ({
    id: p.id,
    name: p.name,
    category: p.category,
    intervalKm: p.intervalKm,
    intervalMonths: p.intervalMonths,
    lastDoneAt: p.lastDoneAt?.toISOString() ?? null,
    lastDoneOdometer: p.lastDoneOdometer,
    due: { ...p.due, dueDate: p.due.dueDate?.toISOString() ?? null },
  });

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <HealthRing value={health} size={64} label={t("garage.health")} />
          <div>
            <h2 className="font-display text-xl font-semibold">{t("maintenance.title")}</h2>
            <p className="text-sm text-muted">{t("maintenance.sub", { value: Math.round(dailyDistance), units: settings.units })}</p>
          </div>
        </div>
        <AddPlanButton carId={car.id} units={settings.units} odometer={car.currentOdometer} />
      </div>
      {plans.length === 0 ? (
        <EmptyState icon="🗓️" title={t("maintenance.empty")} action={<AddPresetsButton carId={car.id} />} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((p) => (
            <PlanCard key={p.id} plan={toView(p)} carId={car.id} units={settings.units} odometer={car.currentOdometer}>
              <DueText due={p.due} units={settings.units} />
            </PlanCard>
          ))}
        </div>
      )}
    </>
  );
}
