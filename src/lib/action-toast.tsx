"use client";

import { toast } from "sonner";

/** Error toast; plan limits get an "Upgrade" action that opens the plan page. */
export function toastActionError(r: { error: string; code?: string }, upgradeLabel = "Upgrade") {
  if (r.code === "limit") {
    toast.error(r.error, { duration: 8000, action: { label: upgradeLabel, onClick: () => window.location.assign(new URL("/w/settings#plan", window.location.origin).toString()) } });
  } else {
    toast.error(r.error);
  }
}
