"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { ConfirmButton } from "@/components/ui/confirm";
import { deleteWorkAction } from "@/app/actions/work";

export function DeleteWorkButton({ carId, workId }: { carId: string; workId: string }) {
  const t = useTranslations();
  const router = useRouter();
  return (
    <ConfirmButton
      size="sm"
      variant="ghost"
      className="size-8 px-0 text-muted opacity-0 transition group-hover:opacity-100 focus:opacity-100 max-lg:opacity-100"
      confirmLabel={t("common.delete")}
      onConfirm={async () => {
        const r = await deleteWorkAction(carId, workId);
        if (!r.ok) return toast.error(r.error);
        toast.success(t("work.deleted"));
        router.refresh();
      }}
    >
      <Trash2 />
    </ConfirmButton>
  );
}
