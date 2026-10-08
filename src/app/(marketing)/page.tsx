import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Activity, BookOpen, BellRing, Send } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { LocaleSwitch } from "@/components/locale-switch";
import { HeroDemo } from "@/components/landing/hero-demo";

export default async function Landing() {
  if (await getCurrentUser()) redirect("/garage");
  const t = await getTranslations("landing");
  const features = [
    { icon: Activity, title: t("f1Title"), body: t("f1") },
    { icon: BookOpen, title: t("f2Title"), body: t("f2") },
    { icon: BellRing, title: t("f3Title"), body: t("f3") },
    { icon: Send, title: t("f4Title"), body: t("f4") },
  ];
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-accent/20 blur-3xl" />
      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <div className="flex items-center gap-2">
          <LocaleSwitch />
          <ButtonLink href="/sign-in" variant="outline" size="sm">
            {t("cta")}
          </ButtonLink>
        </div>
      </header>

      <section className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-2 lg:pt-16">
        <div>
          <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">{t("hero")}</h1>
          <p className="mt-5 max-w-xl text-lg text-muted">{t("sub")}</p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <ButtonLink href="/sign-in" size="lg">
              {t("cta")} →
            </ButtonLink>
            <span className="text-sm text-muted">{t("free")}</span>
          </div>
        </div>
        <HeroDemo />
      </section>

      <section className="relative mx-auto grid max-w-6xl gap-4 px-4 pb-24 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {features.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <div className="mb-4 grid size-11 place-items-center rounded-2xl bg-accent-soft text-accent">
              <Icon className="size-5" />
            </div>
            <h3 className="font-display font-semibold">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
