import { ChevronRight, Phone } from "lucide-react";
import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { CarCard } from "@/components/cars/CarCard";
import { CarFeatures } from "@/components/cars/CarFeatures";
import { CarGallery } from "@/components/cars/CarGallery";
import { CarPlaceholder } from "@/components/cars/CarPlaceholder";
import { CarSpecs } from "@/components/cars/CarSpecs";
import { RulesList } from "@/components/cars/RulesList";
import { TariffList } from "@/components/cars/TariffList";
import { WhatsAppIcon } from "@/components/ui/BrandIcons";
import { ButtonAnchor } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { Link } from "@/i18n/navigation";
import { getCarBySlug, getPublishedCars, pick } from "@/lib/data/cars";
import { getPublicSettings } from "@/lib/data/settings";

export const revalidate = 3600;
export const dynamicParams = true;

type Params = { params: Promise<{ locale: Locale; slug: string }> };

export async function generateStaticParams() {
  const cars = await getPublishedCars();
  return cars.map((car) => ({ slug: car.slug }));
}

function plainText(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, slug } = await params;
  const car = await getCarBySlug(slug);
  if (!car) return {};
  const t = await getTranslations({ locale, namespace: "carPage" });
  const title = pick(car.title, locale);
  const text = plainText(pick(car.description, locale));
  return {
    title: t("metaTitle", { title }),
    description: text ? `${text.slice(0, 150)}${text.length > 150 ? "…" : ""}` : t("metaDescription", { title }),
    openGraph: car.cover ? { images: [{ url: car.cover.url }] } : undefined,
  };
}

export default async function CarPage({ params }: Params) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const [car, cars, settings] = await Promise.all([getCarBySlug(slug), getPublishedCars(), getPublicSettings()]);
  if (!car) notFound();

  const t = await getTranslations("carPage");
  const tn = await getTranslations("nav");
  const tc = await getTranslations("cars");
  const title = pick(car.title, locale);
  const description = pick(car.description, locale);
  const subtitle = [car.make, car.model, car.year].filter(Boolean).join(" · ");
  const others = cars.filter((c) => c.id !== car.id).slice(0, 3);
  const { contacts } = settings;

  return (
    <>
      <div className="pt-[calc(var(--nav-height)+2.5rem)] bg-aurora">
        <div className="container-site">
          <nav aria-label={t("breadcrumb")}>
            <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
              <li>
                <Link href="/" className="hover:text-fg">
                  {tn("home")}
                </Link>
              </li>
              <ChevronRight className="size-3.5" aria-hidden />
              <li>
                <Link href="/automobiliai" className="hover:text-fg">
                  {tn("cars")}
                </Link>
              </li>
              <ChevronRight className="size-3.5" aria-hidden />
              <li aria-current="page" className="text-fg">
                {title}
              </li>
            </ol>
          </nav>

          <header className="mt-8 flex flex-col gap-4">
            <span className="self-start rounded-pill border border-line px-3 py-1 text-xs font-medium glass">
              {pick(car.category.name, locale)}
            </span>
            <h1 className="text-display-lg font-semibold">{title}</h1>
            {subtitle && <p className="text-lg text-muted">{subtitle}</p>}
          </header>
        </div>
      </div>

      {/* DOM order = mobile order: gallery → price & booking → details.
          On desktop the aside becomes a sticky right column spanning both rows. */}
      <div className="container-site grid gap-12 py-10 lg:grid-cols-[1.6fr_1fr] lg:gap-x-14 lg:gap-y-14">
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          {car.images.length > 0 ? (
            <CarGallery
              priority
              images={car.images.map((img) => ({
                url: img.url,
                alt: pick(img.alt, locale),
                blurDataUrl: img.blurDataUrl,
              }))}
            />
          ) : (
            <div className="relative grid aspect-[16/10] place-items-center overflow-hidden rounded-card border border-line bg-linear-to-b from-surface-2 to-bg px-8">
              <CarPlaceholder bodyType={car.bodyType} className="max-w-xl" />
              <p className="absolute bottom-4 left-5 text-xs text-muted">{t("photosSoon")}</p>
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-[calc(var(--nav-height)+1.5rem)] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
          <div className="flex flex-col gap-6 rounded-card border border-line bg-surface p-6">
            {car.fromPerDay !== null && (
              <p className="leading-tight">
                <span className="block text-sm text-muted">{tc("from")}</span>
                <span className="font-display text-4xl font-semibold">{car.fromPerDay} €</span>
                <span className="text-muted"> / {tc("day")}</span>
              </p>
            )}
            <TariffList pricing={car.pricing} deposit={car.deposit} locale={locale} variant="rows" />
            <div className="flex flex-col gap-3">
              <h2 className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">{t("requirements")}</h2>
              <RulesList rules={car.rules} />
            </div>
          </div>

          <div id="rezervacija" className="flex flex-col gap-4 rounded-card border border-amber/25 bg-amber/5 p-6">
            <h2 className="font-display text-lg font-semibold">{t("bookTitle")}</h2>
            <p className="text-sm leading-relaxed text-muted">{t("bookText")}</p>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <ButtonAnchor href={contacts.whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                <WhatsAppIcon size={18} />
                WhatsApp
              </ButtonAnchor>
              <ButtonAnchor href={`tel:${contacts.phoneE164}`} variant="secondary" className="flex-1">
                <Phone className="size-4" aria-hidden />
                {contacts.phone}
              </ButtonAnchor>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-14 lg:col-start-1 lg:row-start-2">
          {description && (
            <Reveal as="section" className="flex flex-col gap-5">
              <h2 className="text-display-md font-semibold">{t("about")}</h2>
              <div
                className="flex max-w-3xl flex-col gap-4 text-lg leading-relaxed text-muted [&_a]:text-amber [&_a]:underline [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-fg"
                dangerouslySetInnerHTML={{ __html: description }}
              />
            </Reveal>
          )}

          <Reveal as="section" className="flex flex-col gap-5">
            <h2 className="text-display-md font-semibold">{t("specs")}</h2>
            <CarSpecs car={car} locale={locale} />
          </Reveal>

          {car.features.length > 0 && (
            <Reveal as="section" className="flex flex-col gap-5">
              <h2 className="text-display-md font-semibold">{t("features")}</h2>
              <CarFeatures features={car.features} locale={locale} />
            </Reveal>
          )}
        </div>
      </div>

      {others.length > 0 && (
        <section className="container-site border-t border-line py-20">
          <h2 className="text-display-md font-semibold">{t("others")}</h2>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {others.map((c, i) => (
              <Reveal as="li" key={c.id} delay={i}>
                <CarCard car={c} locale={locale} />
              </Reveal>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
