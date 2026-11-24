import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CarCard } from "@/components/cars/CarCard";
import { Catalog } from "@/components/cars/Catalog";
import { PageHero } from "@/components/layout/PageHero";
import { getCategories, getPublishedCars, pick } from "@/lib/data/cars";
import { vilniusToday } from "@/lib/dates";

export const revalidate = 300;

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.cars" });
  return { title: t("title"), description: t("description") };
}

export default async function CarsPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.cars");
  const [cars, categories] = await Promise.all([getPublishedCars(), getCategories()]);

  // Cards render on the server; the client Catalog only filters / reorders them.
  const cards = Object.fromEntries(
    cars.map((car, i) => [car.id, <CarCard key={car.id} car={car} locale={locale} priority={i < 3} />]),
  );

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <div className="container-site py-12 md:py-16">
        <Catalog
          cars={cars.map((c) => ({ id: c.id, categorySlug: c.category.slug, price: c.fromPerDay, sort: c.sort }))}
          categories={categories
            .filter((c) => c.carCount > 0)
            .map((c) => ({ slug: c.slug, name: pick(c.name, locale), count: c.carCount }))}
          cards={cards}
          today={vilniusToday()}
        />
      </div>
    </>
  );
}
