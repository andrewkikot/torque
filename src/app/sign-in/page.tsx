import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { SignInForm } from "./sign-in-form";
import { safeNext } from "@/lib/safe-next";
import { Logo } from "@/components/logo";
import { LocaleSwitch } from "@/components/locale-switch";
import Link from "next/link";

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const next = safeNext((await searchParams).next);
  if (await getCurrentUser()) redirect(next);
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden px-4">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[700px] -translate-x-1/2 rounded-full bg-accent/20 blur-3xl" />
      <div className="absolute right-4 top-4">
        <LocaleSwitch />
      </div>
      <div className="relative w-full max-w-sm">
        <Link href="/" className="mb-8 flex justify-center">
          <Logo />
        </Link>
        <SignInForm
          next={next}
          devMode={!process.env.RESEND_API_KEY && process.env.NODE_ENV !== "production"}
          telegram={!!process.env.TELEGRAM_BOT_TOKEN && !!process.env.TELEGRAM_BOT_USERNAME}
          email={process.env.RESEND_API_KEY ? "resend" : process.env.NODE_ENV === "production" ? "telegram-only" : "dev"}
        />
      </div>
    </div>
  );
}
