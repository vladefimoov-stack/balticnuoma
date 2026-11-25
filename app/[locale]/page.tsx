import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Advantages } from "@/components/sections/Advantages";
import { ContactSection } from "@/components/sections/ContactSection";
import { Faq } from "@/components/sections/Faq";
import { FleetPreview } from "@/components/sections/FleetPreview";
import { Hero } from "@/components/sections/Hero";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Requirements } from "@/components/sections/Requirements";
import { getCategories, getPublishedCars } from "@/lib/data/cars";
import { getPublicSettings } from "@/lib/data/settings";
import { JsonLd } from "@/components/seo/JsonLd";
import { pageMetadata } from "@/lib/seo/metadata";
import { businessSchema } from "@/lib/seo/schema";

export const revalidate = 300;

type Params = { params: Promise<{ locale: Locale }> };

/** Cheapest "from" day price across published cars (null when nothing is published / priced). */
function cheapest(cars: Array<{ fromPerDay: number | null }>) {
  const prices = cars.map((c) => c.fromPerDay).filter((p): p is number => p !== null);
  return prices.length > 0 ? Math.min(...prices) : null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const [t, cars] = await Promise.all([getTranslations({ locale, namespace: "metadata" }), getPublishedCars()]);
  const price = cheapest(cars);
  return pageMetadata({
    locale,
    href: "/",
    title: t("title"),
    description: price !== null ? t("descriptionFrom", { price }) : t("description"),
    absoluteTitle: true,
  });
}

export default async function HomePage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [settings, cars, categories] = await Promise.all([getPublicSettings(), getPublishedCars(), getCategories()]);
  // Main tariffs = the first category that has cars (today: Ekonominė), else the global ones.
  const mainCategory = categories.find((c) => c.carCount > 0);
  const pricing = mainCategory?.pricing ?? settings.pricing;
  const rules = mainCategory?.rules ?? settings.rentalRules;

  return (
    <>
      <JsonLd data={businessSchema(settings, locale, cheapest(cars))} />
      <Hero />
      <Advantages />
      <HowItWorks />
      <FleetPreview cars={cars} locale={locale} />
      <Requirements rules={rules} deposit={pricing.deposit} contacts={settings.contacts} />
      <Faq deposit={pricing.deposit} rules={rules} />
      <ContactSection contacts={settings.contacts} hours={settings.openingHours} locale={locale} />
    </>
  );
}
