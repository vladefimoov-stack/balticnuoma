import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/layout/PageHero";
import { ContactSection } from "@/components/sections/ContactSection";
import { Reveal } from "@/components/ui/Reveal";
import { getPublishedCars } from "@/lib/data/cars";
import { getPublicSettings } from "@/lib/data/settings";
import { JsonLd } from "@/components/seo/JsonLd";
import { pageMetadata } from "@/lib/seo/metadata";
import { businessSchema } from "@/lib/seo/schema";

export const revalidate = 300;

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.contacts" });
  return pageMetadata({ locale, href: "/kontaktai", title: t("metaTitle"), description: t("description") });
}

export default async function ContactsPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.contacts");
  const tf = await getTranslations("footer");
  const [settings, cars] = await Promise.all([getPublicSettings(), getPublishedCars()]);
  const prices = cars.map((c) => c.fromPerDay).filter((p): p is number => p !== null);
  const { company } = settings;
  // Empty requisites (not filled in admin yet) are simply not shown.
  const requisites = (
    [
      [t("company"), company.legalName],
      [tf("companyCode"), company.companyCode],
      [tf("vatCode"), company.vatCode],
      [t("registeredAddress"), company.registeredAddress],
    ] as const
  ).filter((row): row is readonly [string, string] => Boolean(row[1]));

  return (
    <>
      <JsonLd data={businessSchema(settings, locale, prices.length > 0 ? Math.min(...prices) : null)} />
      <PageHero eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <ContactSection contacts={settings.contacts} hours={settings.openingHours} locale={locale} />
      <section className="container-site pb-8">
        <Reveal className="grid gap-6 rounded-card border border-line bg-surface p-7 text-sm md:grid-cols-4">
          {requisites.map(([label, value]) => (
            <div key={label}>
              <p className="text-xs tracking-[0.14em] text-muted uppercase">{label}</p>
              <p className="mt-1 font-medium">{value}</p>
            </div>
          ))}
        </Reveal>
      </section>
    </>
  );
}
