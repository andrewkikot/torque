import { getTranslations } from "next-intl/server";
import { requireAcceptedUserFor } from "@/lib/workshop-context";
import { PageHeader } from "@/components/ui/card";
import { WorkshopForm } from "@/components/workshop/workshop-form";

export const metadata = { title: "Create workshop" };

export default async function CreateWorkshopPage() {
  await requireAcceptedUserFor("/w/create");
  const t = await getTranslations("workshop");
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={t("createTitle")} sub={t("createSub")} />
      <WorkshopForm mode="create" />
    </div>
  );
}
