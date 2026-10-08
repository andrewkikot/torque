import { useTranslations } from "next-intl";
import { Warehouse } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";

/** Entry point to the workshop side of Torque. */
export function WorkshopEntryCard({ workshops }: { workshops: { id: string; name: string }[] }) {
  const t = useTranslations("workshop");
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-xl bg-fg text-bg">
          <Warehouse className="size-4" />
        </span>
        <h2 className="font-display text-lg font-semibold">{t("forWorkshops")}</h2>
      </div>
      {workshops.length ? (
        <>
          <p className="text-sm text-muted">{t("memberOf", { names: workshops.map((w) => w.name).join(", ") })}</p>
          <ButtonLink href="/w" variant="dark" className="self-start">
            {t("openBoard")}
          </ButtonLink>
        </>
      ) : (
        <>
          <p className="text-sm text-muted">{t("forWorkshopsSub")}</p>
          <ButtonLink href="/w/create" variant="outline" className="self-start">
            {t("createTitle")}
          </ButtonLink>
        </>
      )}
    </Card>
  );
}
