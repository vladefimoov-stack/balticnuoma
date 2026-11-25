import type { Locale } from "next-intl";
import { mapsDirectionsUrl, site } from "@/lib/config/site";
import { pick, type CarDetail } from "@/lib/data/cars";
import type { PublicSettings } from "@/lib/data/settings";
import { siteOgImage } from "./metadata";
import { absoluteUrl, localizedPath } from "./urls";

/**
 * schema.org JSON-LD builders. Personal-use car rental only — no taxi / ride-hailing wording.
 * The business node has a stable `@id` so car offers can reference it as the seller.
 */

export const BUSINESS_ID = absoluteUrl("/#business");

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** `AutoRental` (a LocalBusiness) — home and contacts pages. */
export function businessSchema(settings: PublicSettings, locale: Locale, fromPerDay: number | null) {
  const { contacts, openingHours, company } = settings;
  return {
    "@context": "https://schema.org",
    "@type": "AutoRental",
    "@id": BUSINESS_ID,
    name: site.name,
    ...(company.legalName !== site.name && { legalName: company.legalName }),
    ...(company.companyCode && { taxID: company.companyCode }),
    ...(company.vatCode && { vatID: company.vatCode }),
    url: absoluteUrl(localizedPath("/", locale)),
    logo: absoluteUrl("/apple-icon.png"),
    image: absoluteUrl(siteOgImage(locale)),
    telephone: contacts.phoneE164,
    ...(contacts.email && { email: contacts.email }),
    address: {
      "@type": "PostalAddress",
      // Street from the admin-edited address ("Birutės g. 21, Klaipėda" → "Birutės g. 21").
      streetAddress: contacts.address.split(",")[0]?.trim() || site.address.street,
      addressLocality: site.address.city,
      ...(site.address.postalCode ? { postalCode: site.address.postalCode } : {}),
      addressCountry: site.address.country,
    },
    geo: { "@type": "GeoCoordinates", latitude: site.address.geo.lat, longitude: site.address.geo.lng },
    hasMap: mapsDirectionsUrl,
    areaServed: { "@type": "City", name: site.address.city },
    openingHoursSpecification: openingHours.map((row) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: row.days.map((d) => DAY_NAMES[d - 1]).filter(Boolean),
      opens: row.opens,
      closes: row.closes,
    })),
    currenciesAccepted: "EUR",
    ...(fromPerDay !== null && {
      priceRange: locale === "en" ? `from €${fromPerDay}/day` : `nuo ${fromPerDay} €/parą`,
    }),
    sameAs: [contacts.whatsappUrl, contacts.telegramUrl].filter(Boolean),
  };
}

type Crumb = { name: string; path: string };

export function breadcrumbSchema(items: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

const FUEL: Record<string, string> = {
  petrol: "Gasoline",
  diesel: "Diesel",
  hybrid: "Hybrid",
  plug_in_hybrid: "Plug-in hybrid",
  electric: "Electric",
  lpg: "LPG",
};

/** `Car` with a daily-rate `Offer` (LeaseOut) — car page. */
export function carSchema(car: CarDetail, locale: Locale, description: string) {
  const url = absoluteUrl(localizedPath({ pathname: "/automobiliai/[slug]", params: { slug: car.slug } }, locale));
  const { specs } = car;
  return {
    "@context": "https://schema.org",
    "@type": "Car",
    name: pick(car.title, locale),
    url,
    ...(description && { description }),
    ...(car.images.length > 0 && { image: car.images.slice(0, 6).map((img) => img.url) }),
    ...(car.make && { brand: { "@type": "Brand", name: car.make } }),
    ...(car.model && { model: car.model }),
    ...(car.year && { vehicleModelDate: String(car.year) }),
    ...(car.bodyType && { bodyType: car.bodyType }),
    ...(car.color && { color: car.color }),
    ...(specs.fuel && { fuelType: FUEL[specs.fuel] }),
    ...(specs.transmission && { vehicleTransmission: specs.transmission === "manual" ? "Manual" : "Automatic" }),
    ...(specs.seats && { seatingCapacity: specs.seats }),
    ...(specs.doors && { numberOfDoors: specs.doors }),
    ...(car.fromPerDay !== null && {
      offers: {
        "@type": "Offer",
        url,
        price: car.fromPerDay,
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
        businessFunction: "http://purl.org/goodrelations/v1#LeaseOut",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: car.fromPerDay,
          priceCurrency: "EUR",
          unitCode: "DAY",
          referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "DAY" },
        },
        seller: { "@id": BUSINESS_ID },
      },
    }),
  };
}
