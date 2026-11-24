import { defineRouting } from "next-intl/routing";

/**
 * LT is the default locale and has no URL prefix (`/automobiliai`).
 * EN lives under `/en/...` with localized, SEO-friendly paths (`/en/cars`).
 *
 * Internal pathnames (keys) are always the Lithuanian ones — they match
 * the folder names under `app/[locale]/`.
 */
export const routing = defineRouting({
  locales: ["lt", "en"],
  defaultLocale: "lt",
  localePrefix: "as-needed",
  // Always serve LT on `/` (better for SEO; no Accept-Language redirects).
  localeDetection: false,
  pathnames: {
    "/": "/",
    "/automobiliai": { lt: "/automobiliai", en: "/cars" },
    "/automobiliai/[slug]": { lt: "/automobiliai/[slug]", en: "/cars/[slug]" },
    "/kainos": { lt: "/kainos", en: "/prices" },
    "/salygos": { lt: "/salygos", en: "/terms" },
    "/kontaktai": { lt: "/kontaktai", en: "/contacts" },
    "/privatumo-politika": { lt: "/privatumo-politika", en: "/privacy-policy" },
    "/slapukai": { lt: "/slapukai", en: "/cookies" },
  },
});

export type Locale = (typeof routing.locales)[number];
export type AppPathname = keyof typeof routing.pathnames;
/** Pathnames without dynamic segments — usable as a plain string `href`. */
export type StaticPathname = Exclude<AppPathname, `${string}[${string}]${string}`>;
