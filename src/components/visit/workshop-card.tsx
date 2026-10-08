import { useTranslations } from "next-intl";
import { Clock, Globe, MapPin, Phone, Send, Wrench } from "lucide-react";
import { Card } from "@/components/ui/card";

type WorkshopInfo = {
  name: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  logoUrl?: string | null;
  accentColor?: string;
  description?: string | null;
  hours?: string | null;
  website?: string | null;
  telegram?: string | null;
};

/** Who is working on the car: profile, opening hours and ways to reach them. */
export function WorkshopCard({ workshop }: { workshop: WorkshopInfo }) {
  const t = useTranslations("workshop");
  const tel = workshop.phone?.replace(/[^\d+]/g, "");
  return (
    <Card className="flex flex-col gap-2.5 text-sm">
      <div className="flex items-center gap-3">
        <span
          className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-accent-soft text-accent"
          style={workshop.logoUrl ? undefined : workshop.accentColor ? { background: workshop.accentColor, color: "white" } : undefined}
        >
          {workshop.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={workshop.logoUrl} alt="" className="size-full object-cover" />
          ) : (
            <Wrench className="size-5" />
          )}
        </span>
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-wider text-muted">{t("workingOnIt")}</div>
          <div className="truncate text-base font-bold">{workshop.name}</div>
        </div>
      </div>
      {workshop.description && <p className="text-muted">{workshop.description}</p>}
      {(workshop.address || workshop.city) && (
        <div className="flex items-center gap-2 text-muted">
          <MapPin className="size-4 shrink-0" /> {[workshop.address, workshop.city].filter(Boolean).join(", ")}
        </div>
      )}
      {workshop.hours && (
        <div className="flex items-center gap-2 text-muted">
          <Clock className="size-4 shrink-0" /> {workshop.hours}
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
      {(workshop.website || workshop.telegram) && (
        <div className="flex flex-wrap gap-2 pt-1">
          {workshop.website && (
            <a href={workshop.website} target="_blank" rel="noreferrer nofollow" className="inline-flex items-center gap-1.5 rounded-xl bg-soft px-3 py-1.5 text-xs font-bold">
              <Globe className="size-3.5" /> {workshop.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            </a>
          )}
          {workshop.telegram && (
            <a href={`https://t.me/${workshop.telegram}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500/10 px-3 py-1.5 text-xs font-bold text-sky-600 dark:text-sky-400">
              <Send className="size-3.5" /> @{workshop.telegram}
            </a>
          )}
        </div>
      )}
    </Card>
  );
}
