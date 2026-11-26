"use client";

import { Clock, ExternalLink, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useConsent } from "@/components/consent/ConsentProvider";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

type MapEmbedProps = {
  query: string;
  title: string;
  locale: string;
  /** Google Maps zoom: 16 for a street address, ~12 for a whole city. */
  zoom?: number;
  /** Short notice shown over the map (e.g. "office temporarily closed"). */
  badge?: string;
  className?: string;
};

/**
 * Google Maps iframe (no API key) in a dark style via CSS filter. Google sets third-party
 * cookies, so the iframe loads only with the visitor's consent ("maps" category — banner or
 * the "Show map" button here) and only once the map scrolls near the viewport.
 */
export function MapEmbed({ query, title, locale, zoom = 16, badge, className }: MapEmbedProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const t = useTranslations("consent");
  const { consent, save } = useConsent();
  const allowed = consent?.maps === true;
  const asking = consent !== undefined && !allowed;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const src = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=${zoom}&hl=${locale}&output=embed`;
  const external = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

  return (
    <div
      ref={ref}
      className={cn("flex flex-col overflow-hidden rounded-card border border-line bg-surface", className)}
    >
      {/* Notice in its own strip above the map, so it never covers Google's own controls. */}
      {badge && (
        <p className="flex items-center gap-2 border-b border-line bg-surface-2 px-4 py-3 text-sm font-medium text-fg">
          <Clock aria-hidden className="size-4 shrink-0 text-amber" />
          {badge}
        </p>
      )}
      <div className="relative flex-1">
        {/* Placeholder grid behind the map (and instead of it until loaded). */}
        <div
          aria-hidden
          className="absolute inset-0 [background-image:linear-gradient(var(--color-line)_1px,transparent_1px),linear-gradient(90deg,var(--color-line)_1px,transparent_1px)] [background-size:40px_40px]"
        />
        {!asking && !badge && (
          <MapPin
            aria-hidden
            className="absolute top-1/2 left-1/2 size-8 -translate-x-1/2 -translate-y-full text-amber"
          />
        )}
        {asking && (
          <div className="absolute inset-0 grid place-items-center p-5">
            <div className="flex max-w-xs flex-col items-center gap-4 rounded-card border border-line p-5 text-center glass">
              <MapPin aria-hidden className="size-7 text-amber" />
              <p className="text-sm leading-relaxed text-muted">{t("mapText")}</p>
              <Button size="sm" onClick={() => save({ maps: true, analytics: consent?.analytics ?? false })}>
                {t("mapShow")}
              </Button>
              <a
                href={external}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-amber hover:underline"
              >
                {t("mapOpen")} <ExternalLink className="size-3" aria-hidden />
              </a>
            </div>
          </div>
        )}
        {visible && allowed && (
          <iframe
            title={title}
            src={src}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="absolute inset-0 h-full w-full border-0 [filter:invert(0.92)_hue-rotate(180deg)_saturate(0.55)_brightness(0.95)_contrast(0.92)]"
          />
        )}
      </div>
    </div>
  );
}
