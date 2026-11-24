import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/layout/PageHero";
import { ContactSection } from "@/components/sections/ContactSection";
import { Reveal } from "@/components/ui/Reveal";
import { site } from "@/lib/config/site";
import { getPublicSettings } from "@/lib/data/settings";

export const revalidate = 3600;

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.contacts" });
  return { title: t("title"), description: t("description") };
}

export default async function ContactsPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.contacts");
  const tf = await getTranslations("footer");
  const settings = await getPublicSettings();

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <ContactSection contacts={settings.contacts} hours={settings.openingHours} locale={locale} />
      <section className="container-site pb-8">
        <Reveal className="grid gap-6 rounded-card border border-line bg-surface p-7 text-sm md:grid-cols-4">
          <div>
            <p className="text-xs tracking-[0.14em] text-muted uppercase">{t("company")}</p>
            <p className="mt-1 font-medium">{site.legal.companyName}</p>
          </div>
          <div>
            <p className="text-xs tracking-[0.14em] text-muted uppercase">{tf("companyCode")}</p>
            <p className="mt-1 font-medium">{site.legal.companyCode}</p>
          </div>
          <div>
            <p className="text-xs tracking-[0.14em] text-muted uppercase">{tf("vatCode")}</p>
            <p className="mt-1 font-medium">{site.legal.vatCode}</p>
          </div>
          <div>
            <p className="text-xs tracking-[0.14em] text-muted uppercase">{t("registeredAddress")}</p>
            <p className="mt-1 font-medium">{site.legal.registeredAddress}</p>
          </div>
        </Reveal>
      </section>
    </>
  );
}
