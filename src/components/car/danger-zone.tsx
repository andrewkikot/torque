"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm";
import { archiveCarAction, deleteCarAction } from "@/app/actions/cars";

export function CarDangerZone({ carId, archived }: { carId: string; archived: boolean }) {
  const t = useTranslations("car");
  const router = useRouter();
  return (
    <div className="mt-10 flex flex-wrap gap-3 border-t border-border pt-6">
      <Button
        variant="outline"
        onClick={async () => {
          const r = await archiveCarAction(carId, !archived);
          if (!r.ok) return toast.error(r.error);
          router.push("/garage");
        }}
      >
        {archived ? <ArchiveRestore /> : <Archive />} {archived ? t("unarchive") : t("archive")}
      </Button>
      <ConfirmButton
        description={t("deleteConfirm")}
        confirmLabel={t("deleteCar")}
        onConfirm={async () => {
          const r = await deleteCarAction(carId);
          if (!r.ok) return toast.error(r.error);
          toast.success(t("deleted"));
          router.push("/garage");
        }}
      >
        <Trash2 /> {t("deleteCar")}
      </ConfirmButton>
    </div>
  );
}
