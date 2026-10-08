import { getTranslations } from "next-intl/server";
import { requireUser, getSettings } from "@/lib/session";
import { PageHeader } from "@/components/ui/card";
import { CarForm } from "@/components/car/car-form";

export const metadata = { title: "Add car" };

export default async function NewCarPage() {
  const user = await requireUser();
  const settings = await getSettings(user.id);
  const t = await getTranslations("wizard");
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("titleNew")} />
      <CarForm units={settings.units} />
    </div>
  );
}
