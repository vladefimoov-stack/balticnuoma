import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/layout/PageHero";

type PageKey = "cars" | "prices" | "terms" | "contacts" | "privacy" | "cookies";
type Params = { params: Promise<{ locale: Locale }> };

/**
 * Temporary factory for phase-1 placeholder pages so navigation works end-to-end.
 * Each page gets replaced with real content in phase 3 / 7.
 */
export function createStubPage(key: PageKey) {
  async function generateMetadata({ params }: Params): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: `pages.${key}` });
    return { title: t("title"), description: t("description") };
  }

  async function Page({ params }: Params) {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations(`pages.${key}`);
    const tc = await getTranslations("common");

    return (
      <>
        <PageHero eyebrow="Baltic Nuoma" title={t("title")} description={t("description")} />
        <div className="container-site py-20">
          <p className="text-muted">{tc("comingSoon")}</p>
        </div>
      </>
    );
  }

  return { generateMetadata, Page };
}
