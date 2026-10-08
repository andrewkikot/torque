import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser, getSettings } from "@/lib/session";
import { TERMS_VERSION } from "@/lib/terms";
import { Logo } from "@/components/logo";
import { LocaleSwitch } from "@/components/locale-switch";
import { AcceptTermsForm } from "./accept-form";
import { safeNext } from "@/lib/safe-next";

export const metadata = { title: "Terms of Use" };

export default async function AcceptTermsPage({ searchParams }: PageProps<"/accept-terms">) {
  const next = safeNext((await searchParams).next);
  const user = await requireUser();
  const settings = await getSettings(user.id);
  if (settings.termsVersion === TERMS_VERSION) redirect(next);
  const t = await getTranslations("terms");
  return (
    <div className="relative min-h-dvh overflow-hidden px-4 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[700px] -translate-x-1/2 rounded-full bg-accent/15 blur-3xl" />
      <div className="relative mx-auto flex max-w-md flex-col gap-6">
        <div className="flex items-center justify-between">
          <Logo />
          <LocaleSwitch />
        </div>
        {settings.termsVersion && (
          <p className="rounded-2xl bg-warning/10 px-4 py-3 text-sm font-medium text-warning">{t("updatedNotice")}</p>
        )}
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">{t("acceptTitle")}</h1>
          <p className="mt-1 text-muted">{t("acceptSub")}</p>
        </div>
        <AcceptTermsForm version={TERMS_VERSION} next={next} />
      </div>
    </div>
  );
}
