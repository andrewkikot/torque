"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CircleSlash } from "lucide-react";
import { ConfirmButton } from "@/components/ui/confirm";
import { detachVisitAction } from "@/app/actions/visits";

export function NotMyCarButton({ visitId }: { visitId: string }) {
  const t = useTranslations("visit");
  const router = useRouter();
  return (
    <ConfirmButton
      size="sm"
      title={t("notMyCarTitle")}
      description={t("notMyCarSub")}
      confirmLabel={t("notMyCar")}
      onConfirm={async () => {
        const r = await detachVisitAction(visitId);
        if (!r.ok) return toast.error(r.error);
        router.push("/visits");
      }}
    >
      <CircleSlash /> {t("notMyCar")}
    </ConfirmButton>
  );
}
