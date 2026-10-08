import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Gauge } from "lucide-react";
import { accentStyle, cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import { STATUS_EMOJI } from "@/lib/domain/visit-status";
import type { Car, ServiceVisit } from "@/db/schema";
import type { PlanWithDue } from "@/lib/services/maintenance";
import { CarPhoto } from "./car-photo";
import { HealthRing } from "./health-ring";
import { DueText } from "./due-text";

export function CarCard({
  car,
  health,
  next,
  activeVisit,
  units,
}: {
  car: Car;
  health: number | null;
  next?: PlanWithDue;
  activeVisit?: Pick<ServiceVisit, "status" | "title">;
  units: string;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const title = car.nickname || `${car.make} ${car.model}`;
  return (
    <Link
      href={`/cars/${car.id}`}
      style={accentStyle(car.accentColor)}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-4xl border border-border bg-card shadow-card transition hover:-translate-y-0.5 hover:shadow-xl",
        car.archived && "opacity-60",
      )}
    >
      <div className="relative">
        <CarPhoto car={car} className="h-44 w-full transition duration-500 group-hover:scale-[1.03]" rounded="rounded-none" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/50 to-transparent" />
        {activeVisit && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-stone-900 shadow backdrop-blur">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-accent" />
            </span>
            {STATUS_EMOJI[activeVisit.status]} {t(`status.${activeVisit.status}`)}
          </span>
        )}
        <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between text-white">
          <div className="min-w-0">
            <div className="truncate font-display text-xl font-bold drop-shadow">{title}</div>
            <div className="truncate text-sm text-white/85">
              {[car.year, car.make, car.model].filter(Boolean).join(" ")}
              {car.nickname ? "" : ""}
            </div>
          </div>
          {car.plate && <span className="rounded-lg bg-white px-2 py-0.5 font-mono text-xs font-bold text-stone-900">{car.plate}</span>}
        </div>
      </div>
      <div className="flex items-center gap-4 p-4">
        <HealthRing value={health} size={48} label={t("garage.health")} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm text-muted">
            <Gauge className="size-4" />
            <span className="tabular font-semibold text-fg">
              {formatNumber(car.currentOdometer, locale)} {units}
            </span>
          </div>
          <div className="mt-0.5 truncate text-sm">
            {next ? (
              <>
                <span className="font-semibold">{next.name}</span>{" "}
                <span className={cn(next.due.status === "overdue" ? "text-danger" : next.due.status === "soon" ? "text-warning" : "text-muted")}>
                  · <DueText due={next.due} units={units} />
                </span>
              </>
            ) : (
              <span className="text-muted">{t("garage.noPlans")}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
