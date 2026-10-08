"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTimeZone } from "next-intl";

/** Tell the server the browser's time zone once, so server-rendered dates match the user's clock. */
export function TimezoneSync() {
  const current = useTimeZone();
  const router = useRouter();
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && tz !== current) {
      document.cookie = `torque_tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
      router.refresh();
    }
  }, [current, router]);
  return null;
}
