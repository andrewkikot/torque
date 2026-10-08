import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser, getSettings } from "@/lib/session";
import { getCar } from "@/lib/services/cars";
import { PageHeader } from "@/components/ui/card";
import { CarForm } from "@/components/car/car-form";
import { CarDangerZone } from "@/components/car/danger-zone";
import { AppError } from "@/lib/errors";

export default async function EditCarPage({ params }: PageProps<"/cars/[id]/edit">) {
  const { id } = await params;
  const user = await requireUser();
  const car = await getCar(user.id, id).catch((e) => {
    if (e instanceof AppError) notFound();
    throw e;
  });
  const settings = await getSettings(user.id);
  const t = await getTranslations("wizard");
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t("titleEdit")} />
      <CarForm
        carId={car.id}
        units={settings.units}
        initial={{
          make: car.make,
          model: car.model,
          year: car.year ? String(car.year) : "",
          fuel: car.fuel,
          transmission: car.transmission ?? "",
          vin: car.vin ?? "",
          plate: car.plate ?? "",
          engine: car.engine ?? "",
          purchaseDate: car.purchaseDate ? car.purchaseDate.toISOString().slice(0, 10) : "",
          nickname: car.nickname ?? "",
          accentColor: car.accentColor,
          photoUrl: car.photoUrl,
        }}
      />
      <CarDangerZone carId={car.id} archived={car.archived} />
    </div>
  );
}
