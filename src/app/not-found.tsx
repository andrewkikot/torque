import { getTranslations } from "next-intl/server";
import { ButtonLink } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("common");
  return (
    <div className="grid min-h-[60dvh] place-items-center px-4 text-center">
      <div>
        <div className="font-display text-7xl font-bold text-accent">404</div>
        <p className="mt-2 text-muted">{t("notFound")} 🛞</p>
        <ButtonLink href="/garage" variant="outline" className="mt-6">
          ← Torque
        </ButtonLink>
      </div>
    </div>
  );
}
