import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTimeZone, getTranslations } from "next-intl/server";
import { ArrowLeft, Clock, Gauge, Wrench } from "lucide-react";
import { membership } from "@/lib/services/workshops";
import { ButtonLink } from "@/components/ui/button";
import { requireUser, getSettings } from "@/lib/session";
import { getVisit } from "@/lib/services/visits";
import { addNoteAction, decideApprovalAction } from "@/app/actions/visits";
import { AppError } from "@/lib/errors";
import { accentStyle } from "@/lib/utils";
import { formatDateTime, formatNumber } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { VisitProgress } from "@/components/visit/visit-progress";
import { Timeline } from "@/components/visit/timeline";
import { Composer } from "@/components/visit/composer";
import { WorkPanel } from "@/components/visit/work-panel";
import { WorkshopCard } from "@/components/visit/workshop-card";
import { NotMyCarButton } from "@/components/visit/not-my-car";
import { AutoRefresh } from "@/components/visit/auto-refresh";
import { CarPhoto } from "@/components/car/car-photo";

/** Owner view: follow the job, approve extra work, message the workshop. The workshop runs it. */
export default async function VisitPage({ params }: PageProps<"/visits/[id]">) {
  const { id } = await params;
  const user = await requireUser();
  const visit = await getVisit(user.id, id).catch((e) => {
    if (e instanceof AppError) notFound();
    throw e;
  });
  const car = visit.car!;
  const settings = await getSettings(user.id);
  // Same person on both sides (e.g. a mechanic servicing their own car): offer the workshop view.
  const staff = visit.workshopId ? await membership(user.id, visit.workshopId) : null;
  const t = await getTranslations();
  const locale = await getLocale();
  const tz = await getTimeZone();
  const closed = visit.status === "completed" || visit.status === "cancelled";
  const carName = car.nickname || `${car.make} ${car.model}`;

  return (
    <div style={accentStyle(car.accentColor)}>
      {!closed && <AutoRefresh />}
      <header className="mb-6 flex items-center gap-3 sm:gap-4">
        <Link href="/visits" className="grid size-10 shrink-0 place-items-center rounded-full bg-soft hover:bg-border" aria-label={t("common.back")}>
          <ArrowLeft className="size-5" />
        </Link>
        <CarPhoto car={car} thumb className="size-14 shrink-0" rounded="rounded-2xl" />
        <div className="min-w-0">
          <Link href={`/cars/${car.id}`} className="text-sm font-semibold text-accent">
            {carName}
          </Link>
          <h1 className="line-clamp-2 text-xl font-extrabold leading-tight sm:font-display sm:text-2xl">{visit.title}</h1>
        </div>
      </header>

      <Card className="mb-6 p-6">
        <VisitProgress status={visit.status} />
        {(visit.eta || visit.odometer != null) && !closed && (
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-4 text-sm">
            {visit.eta && (
              <span className="flex items-center gap-2">
                <Clock className="size-4 text-muted" /> {t("visit.eta")}: <b>{formatDateTime(visit.eta, locale, tz)}</b>
              </span>
            )}
            {visit.odometer != null && (
              <span className="flex items-center gap-2 text-muted">
                <Gauge className="size-4" /> {formatNumber(visit.odometer, locale)} {settings.units}
              </span>
            )}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="order-2 lg:order-1">
          <h2 className="mb-4 font-display text-lg font-semibold">{t("visit.timeline")}</h2>
          {!closed && (
            <div className="mb-6">
              <Composer allowPhoto={false} placeholder={t("visit.messageWorkshop")} onPost={addNoteAction.bind(null, visit.id)} />
            </div>
          )}
          <Timeline events={visit.events} items={visit.workItems} currency={visit.currency} onDecide={decideApprovalAction.bind(null, visit.id)} viewer="owner" />
        </section>
        <aside className="order-1 flex flex-col gap-4 lg:order-2">
          {visit.workshop && <WorkshopCard workshop={visit.workshop} />}
          <WorkPanel items={visit.workItems} currency={visit.currency} units={settings.units} closed readOnly />
          {staff && (
            <ButtonLink href={`/w/jobs/${visit.id}`} variant="dark">
              <Wrench /> {t("mode.openInWorkshop")}
            </ButtonLink>
          )}
          {!closed && (
            <div className="px-1">
              <NotMyCarButton visitId={visit.id} />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
