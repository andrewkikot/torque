import { getTranslations } from "next-intl/server";
import { loadCar } from "@/lib/page-data";
import { listVisits } from "@/lib/services/visits";
import { VisitRow } from "@/components/visit/visit-row";
import { EmptyState } from "@/components/ui/card";
import { ShowToMechanic } from "@/components/car/show-to-mechanic";
import { appUrl } from "@/lib/app-url";

export default async function CarVisitsPage({ params }: PageProps<"/cars/[id]/visits">) {
  const { id } = await params;
  const { user, car } = await loadCar(id);
  const visits = await listVisits(user.id, { carId: car.id });
  const t = await getTranslations("visit");
  return (
    <>
      <div className="mb-5 flex justify-end">
        <ShowToMechanic carId={car.id} appUrl={appUrl()} variant="button" />
      </div>
      {visits.length ? (
        <div className="flex flex-col gap-3">
          {visits.map((v) => (
            <VisitRow key={v.id} visit={v} showCar={false} />
          ))}
        </div>
      ) : (
        <EmptyState icon="🔧" title={t("empty")} sub={t("emptySub")} />
      )}
    </>
  );
}
