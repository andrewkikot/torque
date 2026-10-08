import Link from "next/link";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import { STATUS_EMOJI } from "@/lib/domain/visit-status";
import { formatDate, formatMoney } from "@/lib/format";
import { accentStyle, cn } from "@/lib/utils";
import { visitTotalClient } from "./total";
import type { Car, ServiceVisit } from "@/db/schema";

export function VisitRow({
  visit,
  showCar = true,
}: {
  visit: ServiceVisit & { car: Car; workItems: { cost: string; approved: boolean }[] };
  showCar?: boolean;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const tz = useTimeZone();
  const active = visit.status !== "completed" && visit.status !== "cancelled";
  const name = visit.car.nickname || `${visit.car.make} ${visit.car.model}`;
  return (
    <Link
      href={`/visits/${visit.id}`}
      style={accentStyle(visit.car.accentColor)}
      className={cn(
        "flex items-center gap-4 rounded-3xl border bg-card p-4 shadow-card transition hover:-translate-y-0.5",
        active ? "border-accent/40" : "border-border",
      )}
    >
      <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl text-2xl", active ? "bg-accent-soft" : "bg-soft")}>{STATUS_EMOJI[visit.status]}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{visit.title}</span>
        <span className="block truncate text-sm text-muted">
          {showCar && <>{name} · </>}
          {visit.shopName && <>{visit.shopName} · </>}
          <span className={cn(active && "font-semibold text-accent")}>{t(`status.${visit.status}`)}</span>
          {" · "}
          {formatDate(visit.completedAt ?? visit.plannedAt ?? visit.createdAt, locale, undefined, tz)}
        </span>
      </span>
      <span className="tabular shrink-0 font-display font-semibold">{formatMoney(visitTotalClient(visit.workItems), visit.currency, locale)}</span>
      <ChevronRight className="size-4 shrink-0 text-muted" />
    </Link>
  );
}
