import { getTranslations } from "next-intl/server";
import { requireAcceptedUserFor, getCurrentWorkshop } from "@/lib/workshop-context";
import { previewCheckIn } from "@/lib/services/visits";
import { normalizeCheckinCode } from "@/lib/services/cars";
import { Card, PageHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { CarPhoto } from "@/components/car/car-photo";
import { CheckInForm } from "@/components/workshop/new-job";

export const metadata = { title: "Check in" };

/** Opened by scanning the owner's QR with the phone camera (or from "Enter code"). */
export default async function CheckInPage({ params }: PageProps<"/w/checkin/[code]">) {
  const { code: raw } = await params;
  const code = normalizeCheckinCode(decodeURIComponent(raw));
  const user = await requireAcceptedUserFor(`/w/checkin/${code}`);
  const t = await getTranslations("workshop");
  const ws = await getCurrentWorkshop(user.id);
  if (!ws) {
    return (
      <Card className="mt-10 text-center">
        <h1 className="font-display text-xl font-bold">{t("needWorkshopTitle")}</h1>
        <p className="mt-2 text-sm text-muted">{t("needWorkshopSub")}</p>
        <ButtonLink href="/w/create" className="mt-5">
          {t("createTitle")}
        </ButtonLink>
      </Card>
    );
  }
  const car = await previewCheckIn(user.id, ws.workshop.id, code);
  if (!car) {
    return (
      <div className="mx-auto max-w-xl">
        <PageHeader title={t("codeInvalidTitle")} sub={t("codeInvalidSub")} />
        <ButtonLink href="/w/new" variant="outline">
          {t("enterCode")}
        </ButtonLink>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={t("checkInTitle")} sub={t("checkInSub", { workshop: ws.workshop.name })} />
      <Card className="mb-4 flex items-center gap-4">
        <CarPhoto car={{ photoUrl: car.photoUrl, accentColor: car.color, fuel: car.fuel, make: car.make, model: car.model }} thumb className="size-16 shrink-0" rounded="rounded-2xl" />
        <div className="min-w-0">
          <div className="truncate text-lg font-bold">{[car.year, car.make, car.model].filter(Boolean).join(" ")}</div>
          {car.plate && <span className="rounded-md bg-soft px-1.5 py-0.5 font-mono text-xs font-bold">{car.plate}</span>}
        </div>
      </Card>
      <CheckInForm code={code} odometer={car.odometer} />
    </div>
  );
}
