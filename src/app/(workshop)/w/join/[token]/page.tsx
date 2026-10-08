import { getTranslations } from "next-intl/server";
import { requireAcceptedUserFor } from "@/lib/workshop-context";
import { getInvite, membership } from "@/lib/services/workshops";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { JoinButton } from "@/components/workshop/team";

export const metadata = { title: "Join workshop" };

export default async function JoinPage({ params }: PageProps<"/w/join/[token]">) {
  const { token } = await params;
  const user = await requireAcceptedUserFor(`/w/join/${token}`);
  const t = await getTranslations("workshop");
  const found = await getInvite(token);
  if (!found) {
    return (
      <Card className="mt-10 text-center">
        <h1 className="font-display text-xl font-bold">{t("inviteExpired")}</h1>
        <p className="mt-2 text-sm text-muted">{t("inviteExpiredSub")}</p>
      </Card>
    );
  }
  const already = await membership(user.id, found.workshop.id);
  return (
    <Card className="mt-10 flex flex-col items-center gap-3 p-8 text-center">
      <div className="grid size-16 place-items-center rounded-3xl text-3xl" style={{ background: found.workshop.accentColor }}>
        🔧
      </div>
      <h1 className="font-display text-xl font-bold">{t("joinTitle", { workshop: found.workshop.name })}</h1>
      <p className="text-sm text-muted">{t("joinSub")}</p>
      {already ? (
        <ButtonLink href="/w" className="mt-2">
          {t("openBoard")}
        </ButtonLink>
      ) : (
        <JoinButton token={token} />
      )}
    </Card>
  );
}
