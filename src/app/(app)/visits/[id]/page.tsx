import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, Clock, Phone, Gauge } from "lucide-react";
import { requireUser, getSettings } from "@/lib/session";
import { getVisit } from "@/lib/services/visits";
import { AppError } from "@/lib/errors";
import { accentStyle } from "@/lib/utils";
import { formatDateTime, formatNumber } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { VisitProgress } from "@/components/visit/visit-progress";
import { Timeline } from "@/components/visit/timeline";
import { SharePanel } from "@/components/visit/share-panel";
import { AutoRefresh } from "@/components/visit/auto-refresh";
import { OwnerStatusControls, OwnerComposer, OwnerWorkPanel, DeleteVisitButton } from "@/components/visit/owner-visit-client";
import { CarPhoto } from "@/components/car/car-photo";
import { appUrl } from "@/lib/app-url";

export default async function VisitPage({ params }: PageProps<"/visits/[id]">) {
  const { id } = await params;
  const user = await requireUser();
  const visit = await getVisit(user.id, id).catch((e) => {
    if (e instanceof AppError) notFound();
    throw e;
  });
  const settings = await getSettings(user.id);
  const t = await getTranslations();
  const locale = await getLocale();
  const closed = visit.status === "completed" || visit.status === "cancelled";
  const carName = visit.car.nickname || `${visit.car.make} ${visit.car.model}`;

  return (
    <div style={accentStyle(visit.car.accentColor)}>
      {!closed && <AutoRefresh />}
      <header className="mb-6 flex items-center gap-4">
        <Link href="/visits" className="grid size-10 shrink-0 place-items-center rounded-full bg-soft hover:bg-border" aria-label={t("common.back")}>
          <ArrowLeft className="size-5" />
        </Link>
        <CarPhoto car={visit.car} className="size-14 shrink-0" rounded="rounded-2xl" />
        <div className="min-w-0">
          <Link href={`/cars/${visit.carId}`} className="text-sm font-semibold text-accent">
            {carName}
          </Link>
          <h1 className="truncate font-display text-2xl font-bold">{visit.title}</h1>
          {visit.shopName && <p className="text-sm text-muted">{visit.shopName}</p>}
        </div>
      </header>

      <Card className="mb-6 p-6">
        <VisitProgress status={visit.status} />
        {!closed && (
          <div className="mt-6 border-t border-border pt-5">
            <OwnerStatusControls visitId={visit.id} status={visit.status} />
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section>
          <h2 className="mb-4 font-display text-lg font-semibold">{t("visit.timeline")}</h2>
          {!closed && (
            <div className="mb-6">
              <OwnerComposer visitId={visit.id} />
            </div>
          )}
          <Timeline events={visit.events} items={visit.workItems} currency={visit.currency} visitId={visit.id} canDecide />
        </section>
        <aside className="flex flex-col gap-4">
          <OwnerWorkPanel visitId={visit.id} items={visit.workItems} currency={visit.currency} units={settings.units} closed={closed} />
          {!closed && (
            <SharePanel
              visitId={visit.id}
              token={visit.shareToken}
              enabled={visit.shareEnabled}
              appUrl={appUrl()}
              title={`${carName} · ${visit.title}`}
            />
          )}
          <Card className="flex flex-col gap-2.5 text-sm">
            <h3 className="font-display font-semibold">{t("visit.details")}</h3>
            {visit.eta && !closed && (
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-muted" /> {t("visit.eta")}: <b>{formatDateTime(visit.eta, locale)}</b>
              </div>
            )}
            {visit.plannedAt && (
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-muted" /> {t("visit.plannedAt")}: {formatDateTime(visit.plannedAt, locale)}
              </div>
            )}
            {visit.odometer != null && (
              <div className="flex items-center gap-2">
                <Gauge className="size-4 text-muted" /> {formatNumber(visit.odometer, locale)} {settings.units}
              </div>
            )}
            {visit.shopContact && (
              <div className="flex items-center gap-2">
                <Phone className="size-4 text-muted" />
                {/^\+?[\d\s()-]{6,}$/.test(visit.shopContact) ? (
                  <a href={`tel:${visit.shopContact.replace(/\s/g, "")}`} className="font-semibold text-accent">
                    {visit.shopContact}
                  </a>
                ) : (
                  visit.shopContact
                )}
              </div>
            )}
            <div className="mt-2 border-t border-border pt-2">
              <DeleteVisitButton visitId={visit.id} />
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
