import type { Metadata, Viewport } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { FloatingContacts } from "@/components/layout/FloatingContacts";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { Providers } from "@/components/providers/Providers";
import { routing } from "@/i18n/routing";
import { site } from "@/lib/config/site";
import { CONSENT_COOKIE } from "@/lib/consent";
import { fontVariables } from "@/lib/fonts";
import { OG_LOCALE, OG_SIZE, siteOgImage } from "@/lib/seo/metadata";

/** Only these message namespaces are shipped to the browser (keeps JS small). */
const CLIENT_NAMESPACES = [
  "nav",
  "contact",
  "common",
  "error",
  "catalog",
  "gallery",
  "booking",
  "tariffs",
  "consent",
] as const;

const CONSENT_PREPAINT = `try{if(document.cookie.indexOf("${CONSENT_COOKIE}=")>-1)document.documentElement.setAttribute("data-consent-set","")}catch(e){}`;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: "#0A0B0D",
  colorScheme: "dark",
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = hasLocale(routing.locales, raw) ? raw : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const verification = process.env.GOOGLE_SITE_VERIFICATION?.trim();

  return {
    metadataBase: new URL(site.url),
    title: { default: t("title"), template: t("titleTemplate") },
    description: t("description"),
    applicationName: site.name,
    // Defaults for pages without their own metadata (404 etc.); public pages use pageMetadata().
    openGraph: {
      type: "website",
      siteName: site.name,
      locale: OG_LOCALE[locale],
      title: t("title"),
      description: t("description"),
      images: [{ url: siteOgImage(locale), ...OG_SIZE, alt: t("title") }],
    },
    twitter: { card: "summary_large_image" },
    formatDetection: { telephone: false },
    ...(verification && { verification: { google: verification } }),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const messages = await getMessages();
  const t = await getTranslations("common");
  const clientMessages = Object.fromEntries(CLIENT_NAMESPACES.map((ns) => [ns, messages[ns]]));

  return (
    // suppressHydrationWarning: the consent script below may add data-consent-set before hydration.
    // The script is the first thing in <body> (Next.js manages <head>); it runs before the banner is parsed.
    <html lang={locale} className={fontVariables} suppressHydrationWarning>
      <body>
        {/* Hide the server-rendered cookie banner before the first paint if a choice was already made. */}
        <script dangerouslySetInnerHTML={{ __html: CONSENT_PREPAINT }} />
        <NextIntlClientProvider messages={clientMessages}>
          <Providers>
            <a
              href="#main"
              className="sr-only rounded-pill bg-amber px-4 py-2 text-sm font-semibold text-on-amber focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100]"
            >
              {t("skipToContent")}
            </a>
            <Navbar />
            <main id="main" tabIndex={-1} className="outline-none">
              {children}
            </main>
            <Footer />
            <FloatingContacts />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
