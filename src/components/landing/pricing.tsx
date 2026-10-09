import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { FREE, PRO_DEFAULT_SEATS } from "@/lib/plans";
import { cn } from "@/lib/utils";

/** Workshop plans; car owners are always free. Shown only when billing is on. */
export function Pricing({ price }: { price: string }) {
  const t = useTranslations("plan");
  const free = [t("features.freeJobs", { free: FREE.jobsPerMonth ?? 0 }), t("features.freeTeam"), t("features.freePhotos", { count: FREE.photosPerJob }), t("features.tracking")];
  const pro = [
    t("features.unlimitedJobs"),
    t("features.moreSeats", { seats: PRO_DEFAULT_SEATS }),
    t("features.morePhotos"),
    t("features.branding"),
    t("features.teamTelegram"),
  ];
  return (
    <section className="relative mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <h2 className="mb-2 font-display text-2xl font-bold">{t("pricingTitle")}</h2>
      <p className="mb-6 text-muted">{t("pricingSub")}</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[
          { name: "Free", price: "₴0", items: free, highlight: false },
          { name: "Pro", price, items: pro, highlight: true },
        ].map((p) => (
          <div key={p.name} className={cn("rounded-4xl border p-6 shadow-card", p.highlight ? "border-accent bg-card" : "border-border bg-card")}>
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-display text-xl font-bold">{p.name}</h3>
              <span className="tabular font-display text-lg font-bold">{p.price}</span>
            </div>
            <ul className="mt-4 flex flex-col gap-2 text-sm">
              {p.items.map((i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className={cn("mt-0.5 size-4 shrink-0", p.highlight ? "text-accent" : "text-success")} /> {i}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
