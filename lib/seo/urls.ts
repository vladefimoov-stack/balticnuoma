import type { Locale } from "next-intl";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { site } from "@/lib/config/site";

/** A typed internal href (`"/kontaktai"` or `{ pathname: "/automobiliai/[slug]", params }`). */
export type Href = Parameters<typeof getPathname>[0]["href"];

/** Public path of `href` in `locale` (`/automobiliai` · `/en/cars`). */
export function localizedPath(href: Href, locale: Locale) {
  return getPathname({ href, locale });
}

/** Absolute URL on the canonical origin (NEXT_PUBLIC_SITE_URL). */
export function absoluteUrl(path: string) {
  return `${site.url}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Canonical + hreflang for one page (relative — resolved against `metadataBase`). */
export function alternatesFor(href: Href, locale: Locale) {
  const languages = Object.fromEntries(routing.locales.map((l) => [l, localizedPath(href, l)]));
  return {
    canonical: localizedPath(href, locale),
    languages: { ...languages, "x-default": localizedPath(href, routing.defaultLocale) },
  };
}
