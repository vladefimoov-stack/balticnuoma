"use client";

import { useEffect, useRef, useState } from "react";

type CountUpProps = {
  value: number;
  locale: string;
  /** Format as EUR currency (no decimals unless the value has them). */
  currency?: boolean;
  duration?: number;
  className?: string;
};

function format(value: number, locale: string, currency: boolean, decimals: number) {
  return new Intl.NumberFormat(locale === "lt" ? "lt-LT" : "en-GB", {
    ...(currency ? { style: "currency", currency: "EUR" } : {}),
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Number that counts up when it scrolls into view. Server HTML shows the final
 * value (no-JS, SEO); numbers already on screen or with reduced motion don't animate.
 */
export function CountUp({ value, locale, currency = false, duration = 1400, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const decimals = Number.isInteger(value) ? 0 : 2;
  const [display, setDisplay] = useState(() => format(value, locale, currency, decimals));

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;

    let frame = 0;
    setDisplay(format(0, locale, currency, decimals));
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 4);
          setDisplay(format(value * eased, locale, currency, t < 1 ? 0 : decimals));
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, locale, currency, decimals, duration]);

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {display}
    </span>
  );
}
