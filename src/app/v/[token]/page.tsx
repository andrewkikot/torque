import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { getVisitByToken } from "@/lib/services/visits";
import { accentStyle } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { VisitProgress } from "@/components/visit/visit-progress";
import { Timeline } from "@/components/visit/timeline";
import { AutoRefresh } from "@/components/visit/auto-refresh";
import { CarPhoto } from "@/components/car/car-photo";
import { Logo } from "@/components/logo";
import { LocaleSwitch } from "@/components/locale-switch";
import { ShopControls } from "./shop-client";

export const metadata: Metadata = { title: "Service job", robots: { index: false, follow: false }, referrer: "no-referrer" };

/** Public page for mechanics — no account, authorized by the unguessable share token. */
export default async function ShopPage({ params }: PageProps<"/v/[token]">) {
  const { token } = await params;
  const visit = await getVisitByToken(token);
  if (!visit) notFound();
  const t = await getTranslations();
  const closed = visit.status === "completed" || visit.status === "cancelled";
  const car = visit.car;

  return (
    <div style={accentStyle(car.accentColor)} className="min-h-dvh">
      {!closed && <AutoRefresh intervalMs={30_000} />}
      <header className="border-b border-border bg-bg-elevated">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Logo className="scale-90" />
          <LocaleSwitch />
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-6 flex items-center gap-4">
          <CarPhoto car={car} className="size-16 shrink-0" rounded="rounded-2xl" />
          <div className="min-w-0">
            <div className="text-xs font-bold uppercase tracking-wider text-muted">{t("shop.title")}</div>
            <h1 className="truncate font-display text-2xl font-bold">{visit.title}</h1>
            <p className="text-sm text-muted">
              {[car.year, car.make, car.model].filter(Boolean).join(" ")}
              {car.plate && <span className="ml-2 rounded-md bg-soft px-1.5 py-0.5 font-mono text-xs font-bold text-fg">{car.plate}</span>}
            </p>
          </div>
        </div>

        <Card className="mb-6 p-6">
          <VisitProgress status={visit.status} />
        </Card>

        {closed ? (
          <p className="mb-6 rounded-3xl bg-soft p-4 text-center text-muted">{t("shop.closed")}</p>
        ) : (
          <ShopControls token={token} status={visit.status} items={visit.workItems} currency={visit.currency} />
        )}

        <section className="mt-8">
          <h2 className="mb-4 font-display text-lg font-semibold">{t("visit.timeline")}</h2>
          <Timeline events={visit.events} items={visit.workItems} currency={visit.currency} visitId={visit.id} canDecide={false} />
        </section>
        <footer className="mt-12 text-center text-xs text-subtle">{t("shop.poweredBy")}</footer>
      </main>
    </div>
  );
}
