import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getLocale, getTimeZone, getTranslations } from "next-intl/server";
import { BadgeCheck, Gauge, Receipt, Wrench, CalendarDays, Hash } from "lucide-react";
import { getPublicCar } from "@/lib/services/car-share";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { accentStyle, cn } from "@/lib/utils";
import { Card, Badge } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { CarPhoto } from "@/components/car/car-photo";
import { Logo } from "@/components/logo";
import { LocaleSwitch } from "@/components/locale-switch";
import { CATEGORY_EMOJI } from "@/components/work/categories";

export async function generateMetadata({ params }: PageProps<"/c/[token]">): Promise<Metadata> {
  const data = await getPublicCar((await params).token);
  const name = data ? [data.car.year, data.car.make, data.car.model].filter(Boolean).join(" ") : "Car";
  // Shared on purpose, but not meant for search engines.
  return { title: name, robots: { index: false, follow: false }, referrer: "no-referrer" };
}

// Column count follows the number of stats so no empty cells show.
const GRID: Record<number, string> = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-2 sm:grid-cols-4" };

/** Public, read-only "car passport": only what the owner chose to share. */
export default async function PublicCarPage({ params }: PageProps<"/c/[token]">) {
  const { token } = await params;
  const data = await getPublicCar(token, { countView: true });
  if (!data) notFound();
  const { car, options: o, history, maintenance, stats, units, currency } = data;
  const t = await getTranslations();
  const locale = await getLocale();
  const tz = await getTimeZone();
  const title = [car.year, car.make, car.model].filter(Boolean).join(" ");
  const stat = [
    car.odometer != null && <Stat key="odo" icon={<Gauge />} label={t("car.odometer")} value={`${formatNumber(car.odometer, locale)} ${units}`} />,
    o.history && <Stat key="rec" icon={<Wrench />} label={t("share.records")} value={String(stats.records)} />,
    o.history && <Stat key="ws" icon={<BadgeCheck />} label={t("share.byWorkshop")} value={String(stats.byWorkshop)} />,
    stats.total != null && <Stat key="sum" icon={<Receipt />} label={t("history.totalSpent")} value={formatMoney(stats.total, currency, locale)} />,
    o.history && stats.since && stats.total == null && (
      <Stat key="since" icon={<CalendarDays />} label={t("share.since")} value={formatDate(stats.since, locale, { month: "short", year: "numeric" }, tz)} />
    ),
  ].filter(Boolean);
  const specs = [car.engine, t(`fuel.${car.fuel}`), car.transmission && t(`transmission.${car.transmission}`)].filter(Boolean);

  return (
    <div style={accentStyle(car.accentColor)} className="min-h-dvh">
      <header className="border-b border-border bg-bg-elevated pt-safe">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Logo className="scale-90" />
          <LocaleSwitch />
        </div>
      </header>
      <main className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6">
        <section className="overflow-hidden rounded-4xl border border-border bg-card shadow-card">
          <div className="relative">
            <CarPhoto car={car} className="h-56 w-full sm:h-72" rounded="rounded-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <div className="absolute inset-x-5 bottom-5 text-white">
              <div className="text-xs font-bold uppercase tracking-widest text-white/75">{t("share.passport")}</div>
              <h1 className="font-display text-2xl font-bold drop-shadow sm:text-3xl">{title}</h1>
              {specs.length > 0 && <p className="mt-1 text-sm text-white/85">{specs.join(" · ")}</p>}
            </div>
          </div>
          {stat.length > 0 && <dl className={cn("grid gap-px border-t border-border bg-border", GRID[stat.length])}>{stat}</dl>}
          {(car.plate || car.vin) && (
            <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-border px-5 py-3 text-sm">
              {car.plate && (
                <span>
                  <span className="text-muted">{t("car.plate")}:</span> <span className="font-mono font-bold">{car.plate}</span>
                </span>
              )}
              {car.vin && (
                <span className="flex items-center gap-1">
                  <Hash className="size-3.5 text-muted" /> <span className="select-all font-mono text-xs font-bold">{car.vin}</span>
                </span>
              )}
            </div>
          )}
        </section>

        {maintenance.length > 0 && (
          <Card>
            <h2 className="mb-3 font-display text-lg font-semibold">{t("maintenance.title")}</h2>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {maintenance.map((m) => (
                <li key={m.name} className="flex items-center gap-3 rounded-2xl bg-soft px-3 py-2.5">
                  <span className="text-lg">{CATEGORY_EMOJI[m.category]}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{m.name}</span>
                  <Badge tone={m.status === "overdue" ? "danger" : m.status === "soon" ? "warning" : "success"}>{t(`maintenance.${m.status}`)}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {o.history && (
          <Card>
            <h2 className="mb-1 font-display text-lg font-semibold">{t("history.title")}</h2>
            <p className="mb-4 text-xs text-muted">{t("share.historyNote")}</p>
            {history.length === 0 ? (
              <p className="text-sm text-muted">{t("history.empty")}</p>
            ) : (
              <ol className="flex flex-col divide-y divide-border">
                {history.map((i) => (
                  <li key={i.id} className="flex items-start gap-3 py-3">
                    <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-sm">{CATEGORY_EMOJI[i.category] ?? "🔧"}</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{i.name}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                        <span>{formatDate(i.performedAt, locale, undefined, tz)}</span>
                        {i.odometer != null && <span className="tabular">· {formatNumber(i.odometer, locale)} {units}</span>}
                        {i.byWorkshop ? (
                          <Badge tone="success">
                            <BadgeCheck className="size-3" /> {i.workshop ?? t("share.workshopRecord")}
                          </Badge>
                        ) : (
                          <Badge>{i.diy ? t("history.diy") : t("share.ownerRecord")}</Badge>
                        )}
                        {i.receiptUrl && (
                          <a href={i.receiptUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-accent">
                            <Receipt className="size-3" /> {t("work.receipt")}
                          </a>
                        )}
                      </div>
                    </div>
                    {i.cost != null && <span className="tabular shrink-0 text-sm font-bold">{formatMoney(i.cost, i.currency, locale)}</span>}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        )}

        <Card className="flex flex-col items-start gap-3 bg-fg text-bg sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-display font-semibold">{t("share.ctaTitle")}</div>
            <p className="text-sm text-bg/70">{t("share.ctaSub")}</p>
          </div>
          <ButtonLink href="/" className="shrink-0 bg-bg text-fg">
            {t("landing.cta")}
          </ButtonLink>
        </Card>
        <p className="text-center text-xs text-subtle">
          {t.rich("share.disclaimer", {
            terms: (chunks) => (
              <a href="/terms" className="underline underline-offset-2">
                {chunks}
              </a>
            ),
          })}
        </p>
      </main>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 bg-card px-5 py-4">
      <dt className={cn("flex items-center gap-1.5 text-xs font-semibold text-muted [&_svg]:size-3.5")}>
        {icon}
        {label}
      </dt>
      <dd className="tabular truncate font-display text-lg font-bold">{value}</dd>
    </div>
  );
}
