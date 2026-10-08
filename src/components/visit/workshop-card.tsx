import { useTranslations } from "next-intl";
import { MapPin, Phone, Wrench } from "lucide-react";
import { Card } from "@/components/ui/card";

/** Who is working on the car, with a tap-to-call number. */
export function WorkshopCard({ workshop }: { workshop: { name: string; city: string | null; address: string | null; phone: string | null } }) {
  const t = useTranslations("workshop");
  const tel = workshop.phone?.replace(/[^\d+]/g, "");
  return (
    <Card className="flex flex-col gap-2.5 text-sm">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
          <Wrench className="size-5" />
        </span>
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-wider text-muted">{t("workingOnIt")}</div>
          <div className="truncate text-base font-bold">{workshop.name}</div>
        </div>
      </div>
      {(workshop.address || workshop.city) && (
        <div className="flex items-center gap-2 text-muted">
          <MapPin className="size-4 shrink-0" /> {[workshop.address, workshop.city].filter(Boolean).join(", ")}
        </div>
      )}
      {workshop.phone && (
        <div className="flex items-center gap-2">
          <Phone className="size-4 shrink-0 text-muted" />
          <span className="select-all font-semibold">{workshop.phone}</span>
          {tel && (
            <a href={`tel:${tel}`} className="ml-auto rounded-xl bg-soft px-3 py-1.5 text-xs font-bold">
              {t("call")}
            </a>
          )}
        </div>
      )}
    </Card>
  );
}
