import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { renderSiteOgImage } from "@/lib/seo/og-image";

/** Site Open Graph card: /api/og/lt, /api/og/en (static, refreshed hourly — contacts are editable). */
export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return new Response("Not found", { status: 404 });
  return renderSiteOgImage(locale);
}
