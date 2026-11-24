import { ArrowRight, CircleCheck, TrendingDown, Wallet } from "lucide-react";
import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { RulesList } from "@/components/cars/RulesList";
import { TariffList } from "@/components/cars/TariffList";
import { PageHero } from "@/components/layout/PageHero";
import { INCLUDED_KEYS } from "@/components/sections/PricingSection";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { getCategories, pick, type CategoryView } from "@/lib/data/cars";
import { getPublicSettings } from "@/lib/data/settings";
import { perDayEquivalent, weeklySavingPercent } from "@/lib/pricing/display";

export const revalidate = 300;

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.prices" });
  return { title: t("title"), description: t("description") };
}

export default async function PricesPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pricesPage");
  const tp = await getTranslations("pages.prices");
  const tr = await getTranslations("pricing");
  const [settings, categories] = await Promise.all([getPublicSettings(), getCategories()]);

  // Categories with cars; before the DB is connected, fall back to the global tariffs.
  const withCars = categories.filter((c) => c.carCount > 0);
  const sections: Array<Pick<CategoryView, "slug" | "name" | "description" | "pricing" | "rules">> =
    withCars.length > 0
      ? withCars
      : [
          {
            slug: "default",
            name: { lt: t("defaultCategory"), en: null },
            description: { lt: "", en: null },
            pricing: settings.pricing,
            rules: settings.rentalRules,
          },
        ];
  const main = sections[0].pricing;

  return (
    <>
      <PageHero eyebrow={tp("eyebrow")} title={tp("title")} description={tp("description")} />

      {sections.map((category) => (
        <section key={category.slug} className="container-site flex flex-col gap-10 py-16 md:py-20">
          <Reveal className="flex flex-col gap-3">
            <h2 className="text-display-md font-semibold">{pick(category.name, locale)}</h2>
            {pick(category.description, locale) && (
              <p className="max-w-2xl text-lg text-muted">{pick(category.description, locale)}</p>
            )}
          </Reveal>
          <Reveal delay={1}>
            <TariffList pricing={category.pricing} deposit={category.pricing.deposit} locale={locale} />
          </Reveal>
          <Reveal delay={2} className="rounded-card border border-line bg-surface p-6">
            <h3 className="mb-4 text-xs font-semibold tracking-[0.14em] text-muted uppercase">{t("requirements")}</h3>
            <RulesList rules={category.rules} />
          </Reveal>
        </section>
      ))}

      <section className="container-site grid gap-4 pb-24 md:grid-cols-3">
        <Reveal className="flex flex-col gap-4 rounded-card border border-line bg-surface p-7">
          <CircleCheck className="size-6 text-amber" aria-hidden />
          <h2 className="font-display text-lg font-semibold">{tr("includedTitle")}</h2>
          <ul className="flex flex-col gap-2 text-muted">
            {INCLUDED_KEYS.map((key) => (
              <li key={key}>— {tr(`included.${key}`)}</li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={1} className="flex flex-col gap-4 rounded-card border border-line bg-surface p-7">
          <Wallet className="size-6 text-amber" aria-hidden />
          <h2 className="font-display text-lg font-semibold">{t("depositTitle", { deposit: main.deposit })}</h2>
          <p className="leading-relaxed text-muted">{t("depositText")}</p>
        </Reveal>
        <Reveal delay={2} className="flex flex-col gap-4 rounded-card border border-line bg-surface p-7">
          <TrendingDown className="size-6 text-amber" aria-hidden />
          <h2 className="font-display text-lg font-semibold">{t("longTermTitle")}</h2>
          <p className="leading-relaxed text-muted">
            {main.daily.enabled && main.long_term.enabled
              ? t("longTermText", {
                  daily: main.daily.price,
                  perDay: perDayEquivalent(main.long_term.price_per_week),
                  percent: weeklySavingPercent(main.daily.price, main.long_term.price_per_week),
                  weeks: main.long_term.min_weeks,
                })
              : t("longTermFallback")}
          </p>
        </Reveal>
      </section>

      <section className="container-site pb-8">
        <Reveal className="flex flex-col items-start justify-between gap-6 rounded-card border border-amber/25 bg-amber/5 p-8 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-xl font-semibold">{t("ctaTitle")}</h2>
            <p className="mt-2 text-muted">{t("ctaText")}</p>
          </div>
          <ButtonLink href="/automobiliai" size="lg">
            {t("cta")}
            <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        </Reveal>
      </section>
    </>
  );
}
