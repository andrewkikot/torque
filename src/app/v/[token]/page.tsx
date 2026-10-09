import { notFound } from "next/navigation";
import { getLocale, getTimeZone, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { Clock } from "lucide-react";
import { getVisitByToken, vehicleLabel } from "@/lib/services/visits";
import { getEntitlements } from "@/lib/services/licenses";
import { trackDecideAction, trackNoteAction } from "@/app/actions/shop";
import { getCurrentUser } from "@/lib/session";
import { listCars, carLabel } from "@/lib/services/cars";
import { accentStyle } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { VisitProgress } from "@/components/visit/visit-progress";
import { Timeline } from "@/components/visit/timeline";
import { Composer } from "@/components/visit/composer";
import { WorkPanel } from "@/components/visit/work-panel";
import { WorkshopCard } from "@/components/visit/workshop-card";
import { AutoRefresh } from "@/components/visit/auto-refresh";
import { CarPhoto } from "@/components/car/car-photo";
import { Logo } from "@/components/logo";
import { LocaleSwitch } from "@/components/locale-switch";
import { FollowInTelegram, SaveToGarage } from "./tracking-client";

export const metadata: Metadata = { title: "Service job", robots: { index: false, follow: false }, referrer: "no-referrer" };

/** Public tracking page for the customer: follow the job, approve extra work, message the workshop. */
export default async function TrackingPage({ params }: PageProps<"/v/[token]">) {
  const { token } = await params;
  const visit = await getVisitByToken(token);
  if (!visit) notFound();
  const t = await getTranslations();
  const locale = await getLocale();
  const tz = await getTimeZone();
  const closed = visit.status === "completed" || visit.status === "cancelled";
  const accent = visit.car?.accentColor ?? visit.workshop?.accentColor ?? "#f97316";
  const tile = { photoUrl: visit.car?.photoUrl ?? null, accentColor: accent, fuel: visit.car?.fuel ?? "petrol", make: visit.vehicleMake ?? "", model: visit.vehicleModel ?? "" };
  const user = await getCurrentUser();
  const myCars = user && !visit.carId ? (await listCars(user.id)).map((c) => ({ id: c.id, name: carLabel(c), plate: c.plate })) : [];
  const bot = process.env.TELEGRAM_BOT_USERNAME;
  const branding = visit.workshopId ? (await getEntitlements(visit.workshopId)).branding : false;

  return (
    <div style={accentStyle(accent)} className="min-h-dvh">
      {!closed && <AutoRefresh intervalMs={30_000} />}
      <header className="border-b border-border bg-bg-elevated pt-safe">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Logo className="scale-90" />
          <LocaleSwitch />
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-6 flex items-center gap-4">
          <CarPhoto car={tile} thumb className="size-16 shrink-0" rounded="rounded-2xl" />
          <div className="min-w-0">
            <div className="text-xs font-bold uppercase tracking-wider text-muted">{vehicleLabel(visit)}</div>
            <h1 className="line-clamp-2 text-xl font-extrabold leading-tight sm:font-display sm:text-2xl">{visit.title}</h1>
            {visit.vehiclePlate && <span className="mt-1 inline-block rounded-md bg-soft px-1.5 py-0.5 font-mono text-xs font-bold">{visit.vehiclePlate}</span>}
          </div>
        </div>

        <Card className="mb-6 p-6">
          <VisitProgress status={visit.status} />
          {visit.eta && !closed && (
            <div className="mt-5 flex items-center gap-2 border-t border-border pt-4 text-sm">
              <Clock className="size-4 text-muted" /> {t("visit.eta")}: <b>{formatDateTime(visit.eta, locale, tz)}</b>
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="order-2 lg:order-1">
            <h2 className="mb-4 font-display text-lg font-semibold">{t("visit.timeline")}</h2>
            {!closed && (
              <div className="mb-6">
                <Composer allowPhoto={false} placeholder={t("visit.messageWorkshop")} onPost={trackNoteAction.bind(null, token)} />
              </div>
            )}
            <Timeline events={visit.events} items={visit.workItems} currency={visit.currency} onDecide={trackDecideAction.bind(null, token)} viewer="customer" />
          </section>
          <aside className="order-1 flex flex-col gap-4 lg:order-2">
            {visit.workshop && <WorkshopCard workshop={visit.workshop} branding={branding} />}
            <WorkPanel items={visit.workItems} currency={visit.currency} units="km" closed readOnly />
            {bot && !closed && <FollowInTelegram url={`https://t.me/${bot}?start=trk_${token}`} />}
            {!visit.carId && <SaveToGarage token={token} signedIn={!!user} cars={myCars} />}
          </aside>
        </div>
        <footer className="mt-12 flex flex-col items-center gap-1 text-center text-xs text-subtle">
          <span>
            {t.rich("terms.shopNote", {
              terms: (chunks) => (
                <a href="/terms" className="underline underline-offset-2">
                  {chunks}
                </a>
              ),
            })}
          </span>
          {!branding && <span>{t("shop.poweredBy")}</span>}
        </footer>
      </main>
    </div>
  );
}
