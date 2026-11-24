"use client";

import { MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

type MapEmbedProps = { query: string; title: string; locale: string; className?: string };

/**
 * Google Maps iframe (no API key) in a dark style via CSS filter. The iframe is
 * only created when the map scrolls near the viewport — it's heavy and sets
 * third-party cookies, so it must not load with the page.
 */
export function MapEmbed({ query, title, locale, className }: MapEmbedProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

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

  const src = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=16&hl=${locale}&output=embed`;

  return (
    <div ref={ref} className={cn("relative overflow-hidden rounded-card border border-line bg-surface", className)}>
      {/* Placeholder grid behind the map (and instead of it until loaded). */}
      <div
        aria-hidden
        className="absolute inset-0 [background-image:linear-gradient(var(--color-line)_1px,transparent_1px),linear-gradient(90deg,var(--color-line)_1px,transparent_1px)] [background-size:40px_40px]"
      />
      <MapPin aria-hidden className="absolute top-1/2 left-1/2 size-8 -translate-x-1/2 -translate-y-full text-amber" />
      {visible && (
        <iframe
          title={title}
          src={src}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="absolute inset-0 h-full w-full border-0 [filter:invert(0.92)_hue-rotate(180deg)_saturate(0.55)_brightness(0.95)_contrast(0.92)]"
        />
      )}
    </div>
  );
}
