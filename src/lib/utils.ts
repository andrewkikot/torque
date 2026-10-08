import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Pick black or white text for a given hex background. */
export function readableOn(hex: string) {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const lum = 0.2126 * r ** 2.2 + 0.7152 * g ** 2.2 + 0.0722 * b ** 2.2;
  return lum > 0.4 ? "#1c1917" : "#ffffff";
}

export function accentStyle(hex: string): React.CSSProperties {
  return { ["--accent" as string]: hex, ["--accent-fg" as string]: readableOn(hex) };
}

export const CAR_COLORS = [
  "#f97316", // tangerine
  "#ef4444", // rosso
  "#e11d48", // raspberry
  "#d946ef", // orchid
  "#8b5cf6", // violet
  "#3b82f6", // blue
  "#0ea5e9", // sky
  "#14b8a6", // teal
  "#22c55e", // green
  "#84cc16", // lime
  "#eab308", // yellow
  "#a16207", // bronze
  "#64748b", // slate
  "#1c1917", // midnight
];
