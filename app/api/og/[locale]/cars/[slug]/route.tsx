import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { getCarBySlug, getPublishedCars } from "@/lib/data/cars";
import { renderCarOgImage } from "@/lib/seo/og-image";

/** Car Open Graph card: /api/og/{locale}/cars/{slug} (ISR like the car page). */
export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  const cars = await getPublishedCars();
  return routing.locales.flatMap((locale) => cars.map((car) => ({ locale, slug: car.slug })));
}

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) return new Response("Not found", { status: 404 });
  const car = await getCarBySlug(slug);
  if (!car) return new Response("Not found", { status: 404 });
  return renderCarOgImage(car, locale);
}
