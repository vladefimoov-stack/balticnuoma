import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { routing } from "@/i18n/routing";
import { site } from "@/lib/config/site";
import { alternatesFor, localizedPath, type Href } from "./urls";

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_LOCALE: Record<Locale, string> = { lt: "lt_LT", en: "en_GB" };

/** The branded site card (app/api/og/[locale]). */
export const siteOgImage = (locale: Locale) => `/api/og/${locale}`;

type PageMetaInput = {
  locale: Locale;
  href: Href;
  title: string;
  description: string;
  /** Use `title` as is (no "| Baltic Nuoma" suffix) — the home page. */
  absoluteTitle?: boolean;
  /** OG image path or URL; defaults to the site card. */
  image?: { url: string; alt: string };
};

/** Title, description, canonical + hreflang, Open Graph and Twitter card for a public page. */
export function pageMetadata({ locale, href, title, description, absoluteTitle, image }: PageMetaInput): Metadata {
  const fullTitle = absoluteTitle ? title : `${title} | ${site.name}`;
  const og = image ?? { url: siteOgImage(locale), alt: fullTitle };
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: alternatesFor(href, locale),
    openGraph: {
      type: "website",
      siteName: site.name,
      locale: OG_LOCALE[locale],
      alternateLocale: routing.locales.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
      url: localizedPath(href, locale),
      title: fullTitle,
      description,
      images: [{ ...og, ...OG_SIZE }],
    },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [og.url] },
  };
}
