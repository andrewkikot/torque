"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "./button";
import { Sheet } from "./sheet";

export function ConfirmButton({
  children,
  title,
  description,
  confirmLabel,
  onConfirm,
  variant = "danger-ghost",
  size = "md",
  className,
}: {
  children: React.ReactNode;
  title?: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => Promise<unknown> | void;
  variant?: "danger-ghost" | "danger" | "ghost" | "outline" | "secondary";
  size?: "sm" | "md";
  className?: string;
}) {
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Button type="button" variant={variant} size={size} className={className} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title={title ?? t("areYouSure")}>
        {description && <p className="mb-6 text-muted">{description}</p>}
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>
            {t("cancel")}
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
                setOpen(false);
              } finally {
                setBusy(false);
              }
            }}
          >
            {confirmLabel ?? t("confirm")}
          </Button>
        </div>
      </Sheet>
    </>
  );
}
