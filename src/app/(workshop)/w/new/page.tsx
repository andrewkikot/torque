import { getTranslations } from "next-intl/server";
import { Camera } from "lucide-react";
import { requireWorkshop } from "@/lib/workshop-context";
import { Card, PageHeader } from "@/components/ui/card";
import { CodeEntry, WalkInForm } from "@/components/workshop/new-job";

export const metadata = { title: "New job" };

export default async function NewJobPage() {
  await requireWorkshop();
  const t = await getTranslations("workshop");
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={t("newTitle")} sub={t("newSub")} />
      <div className="flex flex-col gap-4">
        <Card className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
            <Camera className="size-5" />
          </span>
          <div>
            <h2 className="font-bold">{t("scanTitle")}</h2>
            <p className="mt-1 text-sm text-muted">{t("scanSub")}</p>
          </div>
        </Card>
        <CodeEntry />
        <WalkInForm />
      </div>
    </div>
  );
}
