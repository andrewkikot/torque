import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser, getSettings } from "@/lib/session";
import { listCars } from "@/lib/services/cars";
import { PageHeader } from "@/components/ui/card";
import { NewVisitForm } from "@/components/visit/new-visit-form";

export default async function NewVisitPage({ searchParams }: PageProps<"/visits/new">) {
  const { carId } = await searchParams;
  const user = await requireUser();
  const [cars, settings] = await Promise.all([listCars(user.id), getSettings(user.id)]);
  if (!cars.length) redirect("/cars/new");
  const t = await getTranslations("visit");
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={t("newTitle")} />
      <NewVisitForm
        cars={cars.map((c) => ({ id: c.id, name: c.nickname || `${c.make} ${c.model}`, color: c.accentColor, odometer: c.currentOdometer }))}
        defaultCarId={typeof carId === "string" ? carId : cars[0].id}
        units={settings.units}
      />
    </div>
  );
}
