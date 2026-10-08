import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Plus, ChevronRight } from "lucide-react";
import { requireUser, getSettings } from "@/lib/session";
import { listCars, carLabel } from "@/lib/services/cars";
import { plansWithDue } from "@/lib/services/maintenance";
import { listVisits } from "@/lib/services/visits";
import { CarCard } from "@/components/car/car-card";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader, SectionTitle } from "@/components/ui/card";
import { STATUS_EMOJI } from "@/lib/domain/visit-status";
import { accentStyle } from "@/lib/utils";
import { WelcomeConfetti } from "@/components/confetti";

export const metadata = { title: "Garage" };

export default async function GaragePage({ searchParams }: PageProps<"/garage">) {
  const { archived, welcome } = await searchParams;
  const user = await requireUser();
  const [settings, cars, active] = await Promise.all([
    getSettings(user.id),
    listCars(user.id, { includeArchived: archived === "1" }),
    listVisits(user.id, { activeOnly: true }),
  ]);
  const t = await getTranslations();
  const health = await Promise.all(cars.map((c) => plansWithDue(c)));
  const firstName = user.name?.split(" ")[0] || "";

  return (
    <>
      {welcome && <WelcomeConfetti />}
      <PageHeader
        title={t("garage.title")}
        sub={t("garage.greeting", { name: firstName && !firstName.includes("@") ? firstName : "empty" })}
        action={
          cars.length > 0 && (
            <ButtonLink href="/cars/new">
              <Plus /> {t("garage.addCar")}
            </ButtonLink>
          )
        }
      />

      {active.length > 0 && (
        <section className="mb-8">
          <SectionTitle>{t("garage.activeVisits")}</SectionTitle>
          <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            {active.map((v) => (
              <Link
                key={v.id}
                href={`/visits/${v.id}`}
                style={accentStyle(v.car.accentColor)}
                className="flex min-w-72 snap-start items-center gap-3 rounded-3xl border border-border bg-card p-4 shadow-card transition hover:-translate-y-0.5"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-2xl">{STATUS_EMOJI[v.status]}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{v.title}</span>
                  <span className="block truncate text-sm text-muted">
                    {carLabel(v.car)} · <span className="font-semibold text-accent">{t(`status.${v.status}`)}</span>
                  </span>
                </span>
                <ChevronRight className="size-4 text-muted" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {cars.length === 0 ? (
        <EmptyState
          icon="🚗"
          title={t("garage.emptyTitle")}
          sub={t("garage.emptySub")}
          action={
            <ButtonLink href="/cars/new" size="lg">
              <Plus /> {t("garage.addCar")}
            </ButtonLink>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {cars.map((car, i) => (
            <CarCard
              key={car.id}
              car={car}
              health={health[i].health}
              next={health[i].plans.find((p) => p.due.status !== "unknown")}
              activeVisit={active.find((v) => v.carId === car.id)}
              units={settings.units}
            />
          ))}
          <Link
            href="/cars/new"
            className="grid min-h-24 place-items-center rounded-4xl border-2 border-dashed sm:min-h-64 border-border text-muted transition hover:border-accent hover:text-accent"
          >
            <span className="flex items-center gap-2 font-semibold sm:flex-col">
              <Plus className="size-6 sm:size-8" />
              {t("garage.addCar")}
            </span>
          </Link>
        </div>
      )}

      <div className="mt-8 text-center">
        <Link href={archived === "1" ? "/garage" : "/garage?archived=1"} className="text-sm text-muted underline-offset-4 hover:underline">
          {archived === "1" ? t("common.back") : t("garage.showArchived")}
        </Link>
      </div>
    </>
  );
}
