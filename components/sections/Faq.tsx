import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { RentalRules } from "@/lib/db/json";

export const FAQ_KEYS = [
  "included",
  "deposit",
  "accident",
  "abroad",
  "extend",
  "hourly",
  "payment",
  "requirements",
  "documents",
] as const;

/** FAQ accordion on native <details> — accessible and works without JavaScript. */
export async function Faq({ deposit, rules }: { deposit: number; rules: RentalRules }) {
  const t = await getTranslations("faq");

  return (
    <section id="duk" className="container-site grid gap-14 py-24 md:py-32 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
      <SectionHeading eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <Reveal className="border-t border-line">
        {FAQ_KEYS.map((key) => (
          <details key={key} className="group border-b border-line">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 font-display text-base font-semibold transition-colors hover:text-amber-soft [&::-webkit-details-marker]:hidden">
              {t(`items.${key}.q`)}
              <Plus
                className="size-5 shrink-0 text-amber transition-transform duration-300 group-open:rotate-45"
                aria-hidden
              />
            </summary>
            <p className="max-w-2xl pb-6 leading-relaxed text-muted">
              {t(`items.${key}.a`, { deposit, age: rules.min_age, years: rules.min_license_years })}
            </p>
          </details>
        ))}
      </Reveal>
    </section>
  );
}
