/** Parse a mileage value from free text: "84500", "84 500", "84,500", "84k", "84.5k", "84,5 тис". */
export function parseMileage(input: string): number | null {
  const s = input.trim().toLowerCase().replace(/\s+(km|км|mi|miles|миль)\.?$/, "");
  const k = s.match(/^(\d+(?:[.,]\d+)?)\s*(k|к|тис\.?|thousand)$/);
  if (k) {
    const v = Math.round(parseFloat(k[1].replace(",", ".")) * 1000);
    return Number.isFinite(v) ? v : null;
  }
  const digits = s.replace(/[\s,._'’]/g, "");
  if (!/^\d{1,7}$/.test(digits)) return null;
  return parseInt(digits, 10);
}

/** Split "/cmd@BotName args" into command + args. */
export function parseCommand(text: string): { command: string; args: string } | null {
  const m = text.match(/^\/([a-z_]+)(?:@\w+)?(?:\s+([\s\S]*))?$/i);
  if (!m) return null;
  return { command: m[1].toLowerCase(), args: (m[2] ?? "").trim() };
}

export function localeFromTelegram(code?: string): "en" | "uk" {
  return code && /^(uk|ru|be)/i.test(code) ? "uk" : "en";
}
