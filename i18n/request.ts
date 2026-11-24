import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    timeZone: "Europe/Vilnius",
    messages: (await import(`../messages/${locale}.json`)).default,
    formats: {
      number: {
        eur: { style: "currency", currency: "EUR", maximumFractionDigits: 0 },
        eurPrecise: { style: "currency", currency: "EUR", minimumFractionDigits: 2 },
      },
      dateTime: {
        short: { day: "numeric", month: "short", year: "numeric" },
      },
    },
  };
});
