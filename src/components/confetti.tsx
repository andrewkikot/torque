"use client";

import { useEffect } from "react";

export function fireConfetti(color?: string) {
  if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  import("canvas-confetti").then(({ default: confetti }) => {
    const colors = color ? [color, "#ffffff", "#fbbf24"] : undefined;
    confetti({ particleCount: 90, spread: 75, origin: { y: 0.65 }, colors, disableForReducedMotion: true });
  });
}

export function WelcomeConfetti({ color }: { color?: string }) {
  useEffect(() => {
    fireConfetti(color);
  }, [color]);
  return null;
}
