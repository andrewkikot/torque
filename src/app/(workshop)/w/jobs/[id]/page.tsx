import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTimeZone, getTranslations } from "next-intl/server";
import { ArrowLeft, Phone, User, Clock, Gauge, Link2 } from "lucide-react";
import { requireWorkshop } from "@/lib/workshop-context";
import { getJob, vehicleLabel } from "@/lib/services/visits";
import { AppError } from "@/lib/errors";
import { appUrl } from "@/lib/app-url";
import { formatDateTime, formatNumber } from "@/lib/format";
import { Card, Badge } from "@/components/ui/card";
import { VisitProgress } from "@/components/visit/visit-progress";
import { Timeline } from "@/components/visit/timeline";
import { AutoRefresh } from "@/components/visit/auto-refresh";
import { TrackingLinkPanel } from "@/components/visit/tracking-link-panel";
import { CarPhoto } from "@/components/car/car-photo";
import { ApprovalRequest } from "@/components/workshop/approval-request";
import { JobComposer, JobStatus, JobWork } from "@/components/workshop/job-client";

export default async function JobPage({ params }: PageProps<"/w/jobs/[id]">) {
  const { id } = await params;
  const { user } = await requireWorkshop();
  const job = await getJob(user.id, id).catch((e) => {
    if (e instanceof AppError) notFound();
    throw e;
  });
  const t = await getTranslations();
  const locale = await getLocale();
  const tz = await getTimeZone();
  const closed = job.status === "completed" || job.status === "cancelled";
  const tile = { photoUrl: job.car?.photoUrl ?? null, accentColor: job.car?.accentColor ?? "#64748b", fuel: job.car?.fuel ?? "petrol", make: job.vehicleMake ?? "", model: job.vehicleModel ?? "" };
  const tel = job.customerPhone?.replace(/[^\d+]/g, "");

  return (
    <div>
      {!closed && <AutoRefresh />}
      <header className="mb-5 flex items-center gap-3">
        <Link href="/w" className="grid size-10 shrink-0 place-items-center rounded-full bg-soft hover:bg-border" aria-label={t("common.back")}>
          <ArrowLeft className="size-5" />
        </Link>
        <CarPhoto car={tile} thumb className="size-14 shrink-0" rounded="rounded-2xl" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-bold text-muted">{vehicleLabel({ ...job, car: null })}</span>
            {job.vehiclePlate && <span className="rounded-md bg-soft px-1.5 py-0.5 font-mono text-[11px] font-bold">{job.vehiclePlate}</span>}
            {job.carId ? <Badge tone="success">Torque</Badge> : <Badge>{t("workshop.walkIn")}</Badge>}
          </div>
          <h1 className="line-clamp-2 text-xl font-extrabold leading-tight sm:text-2xl">{job.title}</h1>
        </div>
      </header>

      <Card className="mb-5 p-5">
        <VisitProgress status={job.status} />
        {!closed && (
          <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5">
            <JobStatus visitId={job.id} status={job.status} />
            <ApprovalRequest visitId={job.id} currency={job.currency} />
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <aside className="flex flex-col gap-4 lg:order-2">
          <Card className="flex flex-col gap-2.5 text-sm">
            {(job.customerName || job.customerPhone) && (
              <div className="flex items-center gap-2">
                <User className="size-4 shrink-0 text-muted" />
                <span className="font-semibold">{job.customerName ?? "—"}</span>
                {job.customerPhone && <span className="select-all text-muted">{job.customerPhone}</span>}
                {tel && (
                  <a href={`tel:${tel}`} className="ml-auto inline-flex items-center gap-1 rounded-xl bg-soft px-3 py-1.5 text-xs font-bold">
                    <Phone className="size-3" /> {t("workshop.call")}
                  </a>
                )}
              </div>
            )}
            {job.eta && (
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-muted" /> {t("visit.eta")}: <b>{formatDateTime(job.eta, locale, tz)}</b>
              </div>
            )}
            {job.odometer != null && (
              <div className="flex items-center gap-2 text-muted">
                <Gauge className="size-4" /> {formatNumber(job.odometer, locale)} km
              </div>
            )}
            {job.vehicleVin && <div className="font-mono text-xs text-muted">VIN {job.vehicleVin}</div>}
            {job.carId && (
              <div className="flex items-center gap-2 text-xs text-muted">
                <Link2 className="size-3.5" /> {t("workshop.linkedNote")}
              </div>
            )}
          </Card>
          <JobWork visitId={job.id} items={job.workItems} currency={job.currency} closed={closed} />
          <TrackingLinkPanel visitId={job.id} token={job.shareToken} enabled={job.shareEnabled} appUrl={appUrl()} title={`${vehicleLabel(job)} · ${job.title}`} linked={!!job.carId} />
        </aside>
        <section className="lg:order-1">
          <h2 className="mb-4 font-display text-lg font-semibold">{t("visit.timeline")}</h2>
          {!closed && (
            <div className="mb-6">
              <JobComposer visitId={job.id} />
            </div>
          )}
          <Timeline events={job.events} items={job.workItems} currency={job.currency} viewer="shop" />
        </section>
      </div>
    </div>
  );
}
