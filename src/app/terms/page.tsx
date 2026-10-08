import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/logo";
import { LocaleSwitch } from "@/components/locale-switch";
import { TERMS_SECTIONS, TERMS_VERSION } from "@/lib/terms";

export const metadata = { title: "Terms of Use" };

export default async function TermsPage() {
  const t = await getTranslations("terms");
  return (
    <div className="min-h-dvh">
      <header className="border-b border-border bg-bg-elevated pt-safe">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/">
            <Logo className="scale-90" />
          </Link>
          <LocaleSwitch />
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8">
        <TermsBody />
        <p className="mt-10 text-sm text-muted">{t("updated", { version: TERMS_VERSION })}</p>
      </main>
    </div>
  );
}

export async function TermsBody() {
  const t = await getTranslations("terms");
  return (
    <article className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
        <p className="mt-3 text-muted">{t("intro")}</p>
      </div>
      {TERMS_SECTIONS.map((s) => (
        <section key={s}>
          <h2 className="mb-1.5 text-lg font-bold">{t(`${s}_t`)}</h2>
          <p className="leading-relaxed text-fg/85">{t(s)}</p>
        </section>
      ))}
    </article>
  );
}
