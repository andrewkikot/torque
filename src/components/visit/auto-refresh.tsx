"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Poor man's realtime on the free tier: re-fetch server data while the tab is visible.
 * Cheap (one RSC request) and needs no websockets/paid realtime service.
 */
export function AutoRefresh({ intervalMs = 20_000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => document.visibilityState === "visible" && router.refresh();
    const id = setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router, intervalMs]);
  return null;
}
