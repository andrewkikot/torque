import { getTranslations } from "next-intl/server";
import { requireWorkshop } from "@/lib/workshop-context";
import { listMembers } from "@/lib/services/workshops";
import { planStatus } from "@/lib/services/licenses";
import { billingEnabled } from "@/lib/plans";
import { PlanCard } from "@/components/workshop/plan-card";
import { appUrl } from "@/lib/app-url";
import { PageHeader, SectionTitle } from "@/components/ui/card";
import { WorkshopCard } from "@/components/visit/workshop-card";
import { WorkshopForm } from "@/components/workshop/workshop-form";
import { TeamCard, WorkshopSwitcher } from "@/components/workshop/team";

export const metadata = { title: "Workshop settings" };

export default async function WorkshopSettingsPage() {
  const { user, workshop, role, all } = await requireWorkshop();
  const [members, plan] = await Promise.all([listMembers(user.id, workshop.id), planStatus(user.id, workshop.id)]);
  const t = await getTranslations("workshop");
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("settingsTitle")} sub={t("settingsSub")} />
      <div className="flex flex-col gap-5">
        {all.length > 1 && <WorkshopSwitcher current={workshop.id} all={all.map((w) => ({ id: w.workshop.id, name: w.workshop.name }))} />}
        <PlanCard
          entitlements={plan.entitlements}
          usage={plan.usage}
          billing={billingEnabled()}
          isOwner={role === "owner"}
          salesContact={process.env.SALES_CONTACT ?? null}
        />
        <section>
          <SectionTitle>{t("profile")}</SectionTitle>
          {role === "owner" ? (
            <WorkshopForm
              mode="edit"
              initial={{
                name: workshop.name,
                city: workshop.city ?? "",
                address: workshop.address ?? "",
                phone: workshop.phone ?? "",
                accentColor: workshop.accentColor,
                logoUrl: workshop.logoUrl,
                description: workshop.description ?? "",
                hours: workshop.hours ?? "",
                website: workshop.website ?? "",
                telegram: workshop.telegram ?? "",
              }}
            />
          ) : (
            <>
              <WorkshopCard workshop={workshop} />
              <p className="mt-2 px-1 text-xs text-muted">{t("onlyOwnerEdits")}</p>
            </>
          )}
        </section>
        <TeamCard
          me={user.id}
          isOwner={role === "owner"}
          appUrl={appUrl()}
          members={members.map((m) => ({ ...m, joinedAt: m.joinedAt.toISOString() }))}
        />
      </div>
    </div>
  );
}
