"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { activateLicenseAction } from "@/app/actions/workshop";
import { fireConfetti } from "@/components/confetti";

export function ActivateKeyForm({ renew }: { renew: boolean }) {
  const t = useTranslations("plan");
  const router = useRouter();
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const r = await activateLicenseAction(key);
        setBusy(false);
        if (!r.ok) return toast.error(r.error);
        fireConfetti();
        toast.success(t("activated"));
        setKey("");
        router.refresh();
      }}
    >
      <label htmlFor="license-key" className="text-sm font-semibold">
        {renew ? t("renewKey") : t("enterKey")}
      </label>
      <div className="flex gap-2">
        <Input
          id="license-key"
          value={key}
          onChange={(e) => setKey(e.target.value.toUpperCase())}
          placeholder="TQ-PRO-XXXX-XXXX-XXXX"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="font-mono tracking-wider"
        />
        <Button type="submit" loading={busy} disabled={key.replace(/[^0-9A-Z]/gi, "").length < 17}>
          <KeyRound /> {t("activate")}
        </Button>
      </div>
    </form>
  );
}
