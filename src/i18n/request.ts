import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { defaultLocale, isLocale, LOCALE_COOKIE, TZ_COOKIE, DEFAULT_TIME_ZONE, isTimeZone, type Locale } from "./config";

export default getRequestConfig(async () => {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  let locale: Locale = defaultLocale;
  if (isLocale(fromCookie)) {
    locale = fromCookie;
  } else {
    const accept = (await headers()).get("accept-language") ?? "";
    if (/\b(uk|ru)\b/i.test(accept)) locale = "uk";
  }
  const tz = (await cookies()).get(TZ_COOKIE)?.value;
  return {
    locale,
    timeZone: isTimeZone(tz) ? tz : DEFAULT_TIME_ZONE,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
