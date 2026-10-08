import { getTranslations } from "next-intl/server";
import { requireWorkshop } from "@/lib/workshop-context";
import { listMembers } from "@/lib/services/workshops";
import { appUrl } from "@/lib/app-url";
import { Card, PageHeader } from "@/components/ui/card";
import { WorkshopForm } from "@/components/workshop/workshop-form";
import { TeamCard, WorkshopSwitcher } from "@/components/workshop/team";

export const metadata = { title: "Workshop settings" };

export default async function WorkshopSettingsPage() {
  const { user, workshop, role, all } = await requireWorkshop();
  const members = await listMembers(user.id, workshop.id);
  const t = await getTranslations("workshop");
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("settingsTitle")} />
      <div className="flex flex-col gap-5">
        {all.length > 1 && <WorkshopSwitcher current={workshop.id} all={all.map((w) => ({ id: w.workshop.id, name: w.workshop.name }))} />}
        <TeamCard
          me={user.id}
          isOwner={role === "owner"}
          appUrl={appUrl()}
          members={members.map((m) => ({ ...m, joinedAt: m.joinedAt.toISOString() }))}
        />
        {role === "owner" ? (
          <WorkshopForm mode="edit" initial={{ name: workshop.name, city: workshop.city ?? "", address: workshop.address ?? "", phone: workshop.phone ?? "", accentColor: workshop.accentColor }} />
        ) : (
          <Card>
            <div className="font-bold">{workshop.name}</div>
            <div className="text-sm text-muted">{[workshop.address, workshop.city, workshop.phone].filter(Boolean).join(" · ")}</div>
          </Card>
        )}
      </div>
    </div>
  );
}
