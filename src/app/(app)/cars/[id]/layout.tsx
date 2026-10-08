import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, Pencil } from "lucide-react";
import { loadCar } from "@/lib/page-data";
import { getDailyDistance } from "@/lib/services/maintenance";
import { accentStyle } from "@/lib/utils";
import { CarPhoto } from "@/components/car/car-photo";
import { OdometerWidget } from "@/components/car/odometer";
import { CarTabs } from "@/components/car/car-tabs";
import { ShareCar } from "@/components/car/share-car";
import { getShare } from "@/lib/services/car-share";
import { appUrl } from "@/lib/app-url";
import { DEFAULT_SHARE_OPTIONS } from "@/db/schema";

export default async function CarLayout({ children, params }: LayoutProps<"/cars/[id]">) {
  const { id } = await params;
  const { car, settings, user } = await loadCar(id);
  const [perDay, share] = await Promise.all([getDailyDistance(car.id), getShare(user.id, car.id)]);
  const t = await getTranslations();
  const title = car.nickname || `${car.make} ${car.model}`;

  return (
    <div style={accentStyle(car.accentColor)}>
      <section className="no-print relative -mx-4 -mt-[max(1.5rem,env(safe-area-inset-top))] mb-5 overflow-hidden sm:mx-0 sm:mt-0 sm:rounded-4xl">
        <CarPhoto car={car} bare className="h-[calc(16rem+env(safe-area-inset-top))] w-full sm:h-72" rounded="rounded-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/10" />
        <div className="absolute inset-x-4 top-[max(1rem,env(safe-area-inset-top))] flex justify-between">
          <Link href="/garage" className="grid size-10 place-items-center rounded-full bg-black/30 text-white backdrop-blur-md hover:bg-black/45" aria-label={t("common.back")}>
            <ArrowLeft className="size-5" />
          </Link>
          <div className="flex items-center gap-2">
          <ShareCar
            carId={car.id}
            appUrl={appUrl()}
            defaults={DEFAULT_SHARE_OPTIONS}
            initial={share ? { token: share.token, enabled: share.enabled, options: share.options, views: share.views } : null}
          />
          <Link
            href={`/cars/${car.id}/edit`}
            className="flex h-10 items-center gap-2 rounded-full bg-black/30 px-4 text-sm font-semibold text-white backdrop-blur-md hover:bg-black/45"
          >
            <Pencil className="size-4" /> {t("common.edit")}
          </Link>
          </div>
        </div>
        <div className="absolute inset-x-4 bottom-4 flex flex-wrap items-end justify-between gap-4 sm:inset-x-6 sm:bottom-6">
          <div className="min-w-0 text-white">
            <h1 className="truncate font-display text-3xl font-bold drop-shadow sm:text-4xl">{title}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-white/85">
              <span>{[car.year, car.make, car.model, car.engine].filter(Boolean).join(" · ")}</span>
              {car.plate && <span className="rounded-md bg-white px-1.5 py-0.5 font-mono text-xs font-bold text-stone-900">{car.plate}</span>}
            </p>
          </div>
          <OdometerWidget carId={car.id} value={car.currentOdometer} units={settings.units} perDay={perDay} />
        </div>
      </section>
      <CarTabs carId={car.id} />
      {children}
    </div>
  );
}
