import { ArrowRight, CircleCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { TariffList } from "@/components/cars/TariffList";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { Pricing } from "@/lib/db/json";

export const INCLUDED_KEYS = ["insurance", "maintenance", "checked"] as const;

export async function PricingSection({ pricing, locale }: { pricing: Pricing; locale: string }) {
  const t = await getTranslations("pricing");

  return (
    <section id="kainos" className="container-site py-24 md:py-32">
      <SectionHeading
        eyebrow={t("eyebrow")}
        title={t("title")}
        highlight={t("highlight").split(" ")}
        description={t("description")}
      />
      <Reveal className="mt-14">
        <TariffList pricing={pricing} deposit={pricing.deposit} locale={locale} />
      </Reveal>
      <Reveal
        delay={1}
        className="mt-4 flex flex-col gap-6 rounded-card border border-line bg-surface p-6 md:flex-row md:items-center md:justify-between md:p-8"
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold tracking-[0.14em] text-muted uppercase">{t("includedTitle")}</p>
          <ul className="flex flex-col gap-x-8 gap-y-2 md:flex-row md:flex-wrap">
            {INCLUDED_KEYS.map((key) => (
              <li key={key} className="inline-flex items-center gap-2">
                <CircleCheck className="size-5 text-amber" aria-hidden />
                {t(`included.${key}`)}
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted">{t("depositNote", { deposit: pricing.deposit })}</p>
        </div>
        <ButtonLink href="/kainos" variant="secondary" className="self-start md:self-auto">
          {t("more")}
          <ArrowRight className="size-4" aria-hidden />
        </ButtonLink>
      </Reveal>
    </section>
  );
}
