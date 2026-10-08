import { getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";
import { loadCar } from "@/lib/page-data";
import { listVisits } from "@/lib/services/visits";
import { VisitRow } from "@/components/visit/visit-row";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";

export default async function CarVisitsPage({ params }: PageProps<"/cars/[id]/visits">) {
  const { id } = await params;
  const { user, car } = await loadCar(id);
  const visits = await listVisits(user.id, { carId: car.id });
  const t = await getTranslations("visit");
  return (
    <>
      <div className="mb-5 flex justify-end">
        <ButtonLink href={`/visits/new?carId=${car.id}`}>
          <Plus /> {t("newTitle")}
        </ButtonLink>
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
