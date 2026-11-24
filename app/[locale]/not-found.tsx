import { useTranslations } from "next-intl";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  const t = useTranslations("notFound");
  const tc = useTranslations("common");

  return (
    <section className="relative isolate flex min-h-[85svh] items-center overflow-hidden pt-(--nav-height) bg-aurora">
      <DeadEndRoad />
      <div className="container-site">
        <p className="text-gradient font-display text-[clamp(5rem,18vw,14rem)] leading-none font-semibold tracking-[-0.05em]">
          {t("code")}
        </p>
        <h1 className="mt-4 text-display-md font-semibold">{t("title")}</h1>
        <p className="mt-4 max-w-lg text-muted">{t("text")}</p>
        <div className="mt-10 flex flex-wrap gap-4">
          <ButtonLink href="/">{tc("backHome")}</ButtonLink>
          <ButtonLink href="/automobiliai" variant="secondary">
            {t("cars")}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

/** Decorative road fading into the horizon. */
function DeadEndRoad() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute right-0 bottom-0 -z-10 h-[70%] w-full max-w-3xl opacity-60"
      viewBox="0 0 600 500"
      fill="none"
      preserveAspectRatio="xMaxYMax meet"
    >
      <defs>
        <linearGradient id="road-fade" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#FFB547" stopOpacity=".8" />
          <stop offset="1" stopColor="#C9D1DC" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M120 500 L380 120" stroke="url(#road-fade)" strokeWidth="1.5" />
      <path d="M560 500 L400 120" stroke="url(#road-fade)" strokeWidth="1.5" />
      <path d="M340 500 L390 120" stroke="url(#road-fade)" strokeWidth="2" strokeDasharray="18 22" />
      <path d="M360 120 H420" stroke="#FFB547" strokeOpacity=".6" strokeWidth="2" />
    </svg>
  );
}
