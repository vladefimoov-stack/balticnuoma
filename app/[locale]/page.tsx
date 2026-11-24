import { ArrowRight } from "lucide-react";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ButtonLink } from "@/components/ui/Button";

/**
 * Phase 1 placeholder hero. Phase 3 adds the content sections,
 * phase 4 replaces the backdrop with the pinned 3D scroll scene.
 */
export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const [first, ...rest] = t("title").split(". ");

  return (
    <section className="relative isolate flex min-h-[100svh] items-end overflow-hidden pb-24 bg-aurora md:items-center md:pb-0">
      <HeroBackdrop />
      <div className="container-site pt-(--nav-height)">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 className="mt-5 max-w-5xl text-display-xl font-semibold">
          {first}
          {rest.length > 0 && (
            <>
              .<br />
              <span className="text-gradient">{rest.join(". ")}</span>
            </>
          )}
        </h1>
        <p className="mt-7 max-w-xl text-lg leading-relaxed text-muted">{t("subtitle")}</p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <ButtonLink href="/automobiliai" size="lg">
            {t("cta")}
            <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
          <ButtonLink href="/kainos" size="lg" variant="secondary">
            {t("ctaSecondary")}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

/** Lightweight CSS/SVG backdrop: amber light-trails on a perspective floor. */
function HeroBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <svg
        className="absolute inset-x-0 bottom-0 h-[55%] w-full opacity-70"
        viewBox="0 0 1440 500"
        preserveAspectRatio="none"
        fill="none"
      >
        <defs>
          <linearGradient id="trail" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#FFB547" stopOpacity="0" />
            <stop offset=".5" stopColor="#FFB547" stopOpacity=".9" />
            <stop offset="1" stopColor="#C9D1DC" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0A0B0D" stopOpacity="1" />
            <stop offset=".35" stopColor="#0A0B0D" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <path
            key={i}
            d={`M-80 ${500 - i * 18} C 420 ${430 - i * 40}, 980 ${300 - i * 30}, 1520 ${140 + i * 22}`}
            stroke="url(#trail)"
            strokeWidth={i === 2 ? 1.6 : 0.8}
            strokeOpacity={1 - i * 0.12}
          />
        ))}
        <rect width="1440" height="500" fill="url(#fade)" />
      </svg>
      <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-bg to-transparent" />
    </div>
  );
}
