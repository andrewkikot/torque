"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Send, CarFront } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { claimVisitAction } from "@/app/actions/shop";
import { cn } from "@/lib/utils";

export function FollowInTelegram({ url }: { url: string }) {
  const t = useTranslations("tracking");
  return (
    <Card className="flex flex-col gap-3">
      <div>
        <h3 className="font-display font-semibold">{t("telegramTitle")}</h3>
        <p className="text-sm text-muted">{t("telegramSub")}</p>
      </div>
      <a href={url} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-sky-500 px-4 font-semibold text-white hover:brightness-110">
        <Send className="size-4" /> {t("telegramButton")}
      </a>
    </Card>
  );
}

/** Walk-in customer: keep this job (and future ones) in a Torque garage. */
export function SaveToGarage({ token, signedIn, cars }: { token: string; signedIn: boolean; cars: { id: string; name: string; plate: string | null }[] }) {
  const t = useTranslations("tracking");
  const router = useRouter();
  const [carId, setCarId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
          <CarFront className="size-5" />
        </span>
        <div>
          <h3 className="font-display font-semibold">{t("saveTitle")}</h3>
          <p className="text-sm text-muted">{t("saveSub")}</p>
        </div>
      </div>
      {!signedIn ? (
        <ButtonLink href={`/sign-in?next=${encodeURIComponent(`/v/${token}`)}`}>{t("saveSignIn")}</ButtonLink>
      ) : (
        <>
          {cars.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {[...cars, { id: "", name: t("saveNewCar"), plate: null }].map((c) => (
                <button
                  key={c.id || "new"}
                  onClick={() => setCarId(c.id || null)}
                  className={cn(
                    "flex items-center justify-between rounded-2xl border px-3 py-2.5 text-left text-sm font-semibold transition",
                    (carId ?? "") === c.id ? "border-accent bg-accent-soft" : "border-border hover:bg-soft",
                  )}
                >
                  {c.name}
                  {c.plate && <span className="font-mono text-xs text-muted">{c.plate}</span>}
                </button>
              ))}
            </div>
          )}
          <Button
            loading={busy}
            onClick={async () => {
              setBusy(true);
              const r = await claimVisitAction(token, carId);
              setBusy(false);
              if (!r.ok) return toast.error(r.error);
              toast.success(t("saved"));
              router.push(`/visits/${r.data.visitId}`);
            }}
          >
            {t("saveButton")}
          </Button>
        </>
      )}
    </Card>
  );
}
