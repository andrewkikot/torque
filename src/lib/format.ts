export function formatMoney(amount: number, currency = "UAH", locale = "en") {
  try {
    return new Intl.NumberFormat(locale === "uk" ? "uk-UA" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(0)} ${currency}`;
  }
}

export function formatNumber(n: number, locale = "en") {
  return new Intl.NumberFormat(locale === "uk" ? "uk-UA" : "en-US").format(Math.round(n));
}

export function formatDistance(n: number, units: "km" | "mi" = "km", locale = "en") {
  return `${formatNumber(n, locale)} ${units}`;
}

export function formatDate(d: Date | string | null | undefined, locale = "en", opts?: Intl.DateTimeFormatOptions) {
  if (!d) return "";
  return new Intl.DateTimeFormat(locale === "uk" ? "uk-UA" : "en-GB", opts ?? { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(d),
  );
}

export function formatDateTime(d: Date | string, locale = "en") {
  return formatDate(d, locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
