import { getLocale, getTimeZone, getTranslations } from "next-intl/server";
import { loadCar } from "@/lib/page-data";
import { requireAcceptedUser } from "@/lib/session";
import { listHistory, historyStats } from "@/lib/services/work";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { PrintButton } from "./print-button";

export const metadata = { title: "Service history" };

/** Print-friendly service history (browser "Save as PDF") — handy when selling the car. */
export default async function PrintPage({ params }: PageProps<"/print/[id]">) {
  const { id } = await params;
  await requireAcceptedUser();
  const { user, car, settings } = await loadCar(id);
  const [items, stats] = await Promise.all([listHistory(user.id, car.id), historyStats(user.id, car.id)]);
  const t = await getTranslations();
  const locale = await getLocale();
  const tz = await getTimeZone();
  return (
    <div className="mx-auto max-w-3xl bg-white px-8 py-10 text-stone-900">
      <div className="no-print mb-6 flex justify-end">
        <PrintButton label={t("common.print")} />
      </div>
      <header className="mb-8 flex items-start justify-between gap-6 border-b-2 border-stone-900 pb-6">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-stone-500">{t("history.printTitle")}</div>
          <h1 className="mt-1 font-display text-3xl font-bold">
            {[car.year, car.make, car.model].filter(Boolean).join(" ")}
          </h1>
          <div className="mt-2 space-x-4 text-sm text-stone-600">
            {car.vin && <span>VIN: <span className="font-mono">{car.vin}</span></span>}
            {car.plate && <span>{t("car.plate")}: {car.plate}</span>}
            {car.engine && <span>{car.engine}</span>}
          </div>
        </div>
        <div className="text-right text-sm">
          <div className="text-stone-500">{t("car.odometer")}</div>
          <div className="font-display text-2xl font-bold">
            {formatNumber(car.currentOdometer, locale)} {settings.units}
          </div>
        </div>
      </header>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-300 text-left text-xs uppercase tracking-wider text-stone-500">
            <th className="py-2 pr-3">{t("work.date")}</th>
            <th className="py-2 pr-3">{t("work.odometer")}</th>
            <th className="py-2 pr-3">{t("work.name")}</th>
            <th className="py-2 pr-3">{t("visit.shop")}</th>
            <th className="py-2 text-right">{t("work.cost")}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id} className="break-inside-avoid border-b border-stone-200 align-top">
              <td className="whitespace-nowrap py-2 pr-3">{formatDate(i.performedAt, locale, undefined, tz)}</td>
              <td className="whitespace-nowrap py-2 pr-3 tabular">{i.odometer != null ? formatNumber(i.odometer, locale) : "—"}</td>
              <td className="py-2 pr-3">
                <div className="font-semibold">{i.name}</div>
                <div className="text-xs text-stone-500">
                  {t(`category.${i.category}`)}
                  {i.partNumber && ` · #${i.partNumber}`}
                </div>
              </td>
              <td className="py-2 pr-3 text-stone-600">{i.diy ? t("history.diy") : i.visit?.shopName ?? "—"}</td>
              <td className="whitespace-nowrap py-2 text-right tabular">{formatMoney(Number(i.cost), i.currency, locale)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4} className="pt-4 text-right font-semibold">
              {t("history.totalSpent")}
            </td>
            <td className="pt-4 text-right font-display text-lg font-bold">{formatMoney(stats.total, settings.currency, locale)}</td>
          </tr>
        </tfoot>
      </table>
      <footer className="mt-10 text-center text-xs text-stone-400">{t("history.printGenerated", { date: formatDate(new Date(), locale, undefined, tz) })}</footer>
    </div>
  );
}
