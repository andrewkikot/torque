"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { acceptTermsAction } from "@/app/actions/settings";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const CHECKS = ["check1", "check2", "check3"] as const;

/** Every statement must be ticked explicitly; nothing is pre-checked. */
export function AcceptTermsForm({ version, next }: { version: string; next: string }) {
  const t = useTranslations("terms");
  const router = useRouter();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const all = CHECKS.every((c) => checked[c]);

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-1 p-2">
        {CHECKS.map((c) => (
          <label
            key={c}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-2xl p-3 transition",
              checked[c] ? "bg-accent-soft" : "hover:bg-soft",
            )}
          >
            <input
              id={`terms-${c}`}
              type="checkbox"
              className="peer sr-only"
              checked={!!checked[c]}
              onChange={(e) => setChecked((s) => ({ ...s, [c]: e.target.checked }))}
            />
            <span
              aria-hidden
              className={cn(
                "mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg border-2 transition peer-focus-visible:ring-4 peer-focus-visible:ring-accent-soft",
                checked[c] ? "border-accent bg-accent text-accent-fg" : "border-border bg-card",
              )}
            >
              {checked[c] && <Check className="size-4" strokeWidth={3} />}
            </span>
            <span className="text-[15px] leading-snug">{t(c)}</span>
          </label>
        ))}
      </Card>
      <Link href="/terms" target="_blank" className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-accent">
        {t("readFull")} <ExternalLink className="size-3.5" />
      </Link>
      <Button
        size="lg"
        disabled={!all}
        loading={busy}
        onClick={async () => {
          setBusy(true);
          const r = await acceptTermsAction(version);
          if (!r.ok) {
            setBusy(false);
            return toast.error(r.error);
          }
          router.replace(next);
          router.refresh();
        }}
      >
        {t("accept")}
      </Button>
      <Button
        variant="ghost"
        onClick={async () => {
          await authClient.signOut();
          router.replace("/");
          router.refresh();
        }}
      >
        {t("decline")}
      </Button>
    </div>
  );
}
