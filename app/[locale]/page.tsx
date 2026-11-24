import type { Locale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Advantages } from "@/components/sections/Advantages";
import { ContactSection } from "@/components/sections/ContactSection";
import { Faq } from "@/components/sections/Faq";
import { FleetPreview } from "@/components/sections/FleetPreview";
import { Hero } from "@/components/sections/Hero";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Requirements } from "@/components/sections/Requirements";
import { getCategories, getPublishedCars } from "@/lib/data/cars";
import { getPublicSettings } from "@/lib/data/settings";

export const revalidate = 300;

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [settings, cars, categories] = await Promise.all([getPublicSettings(), getPublishedCars(), getCategories()]);
  // Main tariffs = the first category that has cars (today: Ekonominė), else the global ones.
  const mainCategory = categories.find((c) => c.carCount > 0);
  const pricing = mainCategory?.pricing ?? settings.pricing;
  const rules = mainCategory?.rules ?? settings.rentalRules;

  return (
    <>
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
