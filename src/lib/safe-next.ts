/** Only same-site relative paths are allowed as post-sign-in destinations. */
export function safeNext(next: unknown, fallback = "/start"): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next.slice(0, 300);
}
