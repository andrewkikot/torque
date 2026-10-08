import { getTranslations } from "next-intl/server";
import { QrCode } from "lucide-react";
import { requireUser } from "@/lib/session";
import { listVisits } from "@/lib/services/visits";
import { VisitRow } from "@/components/visit/visit-row";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader, SectionTitle } from "@/components/ui/card";

export const metadata = { title: "Service" };

export default async function VisitsPage() {
  const user = await requireUser();
  const visits = await listVisits(user.id);
  const t = await getTranslations();
  const active = visits.filter((v) => v.status !== "completed" && v.status !== "cancelled");
  const past = visits.filter((v) => !active.includes(v));
  return (
    <>
      <PageHeader title={t("visit.title")} sub={t("visit.sub")} />
      {visits.length === 0 ? (
        <EmptyState
          icon={<QrCode className="size-7 text-accent" />}
          title={t("visit.empty")}
          sub={t("visit.emptySub")}
          action={<ButtonLink href="/garage">{t("visit.emptyAction")}</ButtonLink>}
        />
      ) : (
        <div className="flex flex-col gap-8">
          {active.length > 0 && (
            <section>
              <SectionTitle>{t("visit.active")}</SectionTitle>
              <div className="flex flex-col gap-3">
                {active.map((v) => (
                  <VisitRow key={v.id} visit={v} />
                ))}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <SectionTitle>{t("visit.past")}</SectionTitle>
              <div className="flex flex-col gap-3">
                {past.map((v) => (
                  <VisitRow key={v.id} visit={v} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
