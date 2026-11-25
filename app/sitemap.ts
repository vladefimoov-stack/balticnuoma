import type { MetadataRoute } from "next";
import type { Locale } from "next-intl";
import { routing, type StaticPathname } from "@/i18n/routing";
import { getPublishedCars } from "@/lib/data/cars";
import { absoluteUrl, localizedPath, type Href } from "@/lib/seo/urls";

/** /sitemap.xml — every public page in LT and EN (with hreflang alternates) + published cars. */
export const revalidate = 3600;

const PAGES: Array<{ href: StaticPathname; priority: number; changeFrequency: "daily" | "weekly" | "yearly" }> = [
  { href: "/", priority: 1, changeFrequency: "weekly" },
  { href: "/automobiliai", priority: 0.9, changeFrequency: "daily" },
  { href: "/kontaktai", priority: 0.6, changeFrequency: "yearly" },
  { href: "/salygos", priority: 0.4, changeFrequency: "yearly" },
  { href: "/privatumo-politika", priority: 0.2, changeFrequency: "yearly" },
  { href: "/slapukai", priority: 0.2, changeFrequency: "yearly" },
];

function entries(href: Href, extra: Omit<MetadataRoute.Sitemap[number], "url">): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(routing.locales.map((l) => [l, absoluteUrl(localizedPath(href, l))]));
  return routing.locales.map((locale: Locale) => ({
    url: absoluteUrl(localizedPath(href, locale)),
    alternates: { languages: { ...languages, "x-default": languages[routing.defaultLocale] } },
    ...extra,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const cars = await getPublishedCars();
  return [
    ...PAGES.flatMap(({ href, priority, changeFrequency }) => entries(href, { priority, changeFrequency })),
    ...cars.flatMap((car) =>
      entries(
        { pathname: "/automobiliai/[slug]", params: { slug: car.slug } },
        { priority: 0.8, changeFrequency: "weekly" },
      ),
    ),
  ];
}
