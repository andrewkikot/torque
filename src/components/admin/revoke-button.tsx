"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/ui/confirm";
import { revokeLicenseAction } from "@/app/actions/admin";

export function RevokeButton({ id }: { id: string }) {
  const t = useTranslations("admin");
  const router = useRouter();
  return (
    <ConfirmButton
      size="sm"
      description={t("revokeSub")}
      confirmLabel={t("revoke")}
      onConfirm={async () => {
        const r = await revokeLicenseAction(id);
        if (!r.ok) return toast.error(r.error);
        router.refresh();
      }}
    >
      {t("revoke")}
    </ConfirmButton>
  );
}
