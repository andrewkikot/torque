"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "motion/react";
import { MailCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Card } from "@/components/ui/card";

export function SignInForm({ devMode }: { devMode: boolean }) {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await authClient.signIn.magicLink({ email, callbackURL: "/garage", newUserCallbackURL: "/garage?welcome=1" });
    setBusy(false);
    if (error) setError(t("error"));
    else setSent(true);
  }

  return (
    <Card className="p-7">
      <AnimatePresence mode="wait">
        {sent ? (
          <motion.div key="sent" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            <div className="mx-auto mb-4 grid size-16 place-items-center rounded-3xl bg-accent-soft text-accent">
              <MailCheck className="size-8" />
            </div>
            <h1 className="font-display text-xl font-semibold">{t("checkEmail")}</h1>
            <p className="mt-2 text-sm text-muted">{t("checkEmailSub", { email })}</p>
            {devMode && <p className="mt-4 rounded-2xl bg-warning/10 px-3 py-2 text-xs text-warning">{t("devHint")}</p>}
            <Button variant="ghost" size="sm" className="mt-5" onClick={() => setSent(false)}>
              {t("useAnother")}
            </Button>
          </motion.div>
        ) : (
          <motion.form key="form" onSubmit={submit} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
            <div>
              <h1 className="font-display text-xl font-semibold">{t("title")}</h1>
              <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
            </div>
            <Input
              type="email"
              required
              autoFocus
              autoComplete="email"
              placeholder={t("emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label={t("email")}
            />
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" size="lg" loading={busy}>
              {busy ? t("sending") : t("send")}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
    </Card>
  );
}
