"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("common");
  return (
    <div className="grid min-h-[50dvh] place-items-center text-center">
      <div>
        <div className="text-5xl">🔧</div>
        <p className="mt-3 text-muted">{t("somethingWrong")}</p>
        <Button className="mt-5" onClick={reset}>
          ↻
        </Button>
      </div>
    </div>
  );
}
