import { ArrowUpRight, Clock, MapPin, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/Logo";
import { TelegramIcon, WhatsAppIcon } from "@/components/ui/BrandIcons";
import { Link } from "@/i18n/navigation";
import { mapsDirectionsUrl, site, telegramUrl } from "@/lib/config/site";
import { navItems } from "./nav-items";

const linkClass = "text-sm text-muted transition-colors duration-300 hover:text-fg";

export async function Footer() {
  const t = await getTranslations("footer");
  const tn = await getTranslations("nav");
  const tc = await getTranslations("contact");
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-32 overflow-hidden border-t border-line bg-bg">
      <div aria-hidden className="absolute inset-x-0 top-0 hairline-accent opacity-60" />

      <div className="container-site grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1.2fr_1fr] lg:gap-8">
        <div className="flex flex-col gap-5">
          <Link href="/" className="-m-1 self-start rounded-lg p-1" aria-label={`Baltic Nuoma — ${tn("home")}`}>
            <Logo />
          </Link>
          <p className="max-w-xs text-sm leading-relaxed text-muted">{t("tagline")}</p>
        </div>

        <nav aria-label={t("navigation")}>
          <h2 className="mb-5 eyebrow font-sans">{t("navigation")}</h2>
          <ul className="flex flex-col gap-3">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={linkClass}>
                  {tn(item.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="mb-5 eyebrow font-sans">{t("contacts")}</h2>
          <address className="flex flex-col gap-3 not-italic">
            <a
              href={mapsDirectionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${linkClass} group inline-flex items-start gap-2.5`}
            >
              <MapPin className="mt-0.5 size-4 shrink-0 text-amber" aria-hidden />
              <span>
                {site.address.street}, {site.address.city}
                <span className="ml-1.5 inline-flex items-center gap-0.5 text-xs text-amber/80 group-hover:text-amber">
                  {tc("directions")}
                  <ArrowUpRight className="size-3" aria-hidden />
                </span>
              </span>
            </a>
            <a href={`tel:${site.phone.e164}`} className={`${linkClass} inline-flex items-center gap-2.5`}>
              <Phone className="size-4 shrink-0 text-amber" aria-hidden />
              {site.phone.display}
            </a>
            <a
              href={site.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${linkClass} inline-flex items-center gap-2.5`}
            >
              <WhatsAppIcon size={16} className="shrink-0 text-amber" />
              WhatsApp
            </a>
            {telegramUrl && (
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${linkClass} inline-flex items-center gap-2.5`}
              >
                <TelegramIcon size={16} className="shrink-0 text-amber" />
                Telegram
              </a>
            )}
            <p className="inline-flex items-center gap-2.5 text-sm text-muted">
              <Clock className="size-4 shrink-0 text-amber" aria-hidden />
              <span>
                <span className="sr-only">{t("hours")}: </span>
                {t("hoursValue")}
              </span>
            </p>
          </address>
        </div>

        <nav aria-label={t("legal")}>
          <h2 className="mb-5 eyebrow font-sans">{t("legal")}</h2>
          <ul className="flex flex-col gap-3">
            <li>
              <Link href="/salygos" className={linkClass}>
                {t("terms")}
              </Link>
            </li>
            <li>
              <Link href="/privatumo-politika" className={linkClass}>
                {t("privacy")}
              </Link>
            </li>
            <li>
              <Link href="/slapukai" className={linkClass}>
                {t("cookies")}
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      <div className="container-site flex flex-col gap-3 border-t border-line py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between md:pr-24">
        <p>
          © {year} {site.legal.companyName}. {t("rights")}
        </p>
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          <span>
            {t("companyCode")}: {site.legal.companyCode}
          </span>
          <span>
            {t("vatCode")}: {site.legal.vatCode}
          </span>
        </p>
      </div>

      {/* Oversized faded wordmark — decorative */}
      <div aria-hidden className="pointer-events-none overflow-hidden select-none">
        <p className="-mb-[0.22em] translate-y-[0.06em] text-fade text-center font-display text-[18vw] leading-none font-semibold tracking-[-0.04em] whitespace-nowrap">
          BALTIC
        </p>
      </div>
    </footer>
  );
}
