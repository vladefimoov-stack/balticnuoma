"use client";

import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import type { ComponentProps } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils/cn";

const languageNames: Record<Locale, string> = { lt: "Lietuvių", en: "English" };

type Href = ComponentProps<typeof Link>["href"];

/** LT / EN segmented switch. Renders real links so both versions are crawlable. */
export function LanguageSwitcher({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const { locale: _ignored, ...params } = useParams<Record<string, string>>();
  const href = { pathname, params } as Href;

  return (
    <div
      role="group"
      aria-label={t("language")}
      className={cn(
        "items-center rounded-pill border border-line p-0.5 text-[0.7rem] font-semibold tracking-[0.14em]",
        className,
      )}
    >
      {routing.locales.map((l) => {
        const active = l === locale;
        return (
          <Link
            key={l}
            href={href}
            locale={l}
            hrefLang={l}
            onClick={onNavigate}
            aria-current={active ? "true" : undefined}
            className={cn(
              "rounded-pill px-2.5 py-1.5 uppercase transition-colors duration-300",
              active ? "bg-white/[0.08] text-fg" : "text-muted hover:text-fg",
            )}
          >
            {/* Visible code + hidden hint: the accessible name must contain the visible text (WCAG 2.5.3). */}
            {l}
            <span className="sr-only"> — {t("switchTo", { language: languageNames[l] })}</span>
          </Link>
        );
      })}
    </div>
  );
}
