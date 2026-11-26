import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

const STEPS = ["choose", "confirm", "handover"] as const;

export async function HowItWorks() {
  const t = await getTranslations("howItWorks");

  return (
    <section id="kaip-tai-veikia" className="border-y border-line bg-surface/40">
      <div className="container-site py-24 md:py-32">
        <SectionHeading eyebrow={t("eyebrow")} title={t("title")} highlight={t("highlight").split(" ")} />
        <ol className="relative mt-16 grid gap-10 md:grid-cols-3 md:gap-8">
          <span
            aria-hidden
            className="absolute top-6 right-[16%] left-[16%] hidden h-px bg-linear-to-r from-amber/0 via-amber/50 to-silver/0 md:block"
          />
          {STEPS.map((step, i) => (
            <Reveal
              as="li"
              key={step}
              delay={i}
              className="relative flex flex-col gap-4 md:items-center md:text-center"
            >
              <span className="relative grid size-12 place-items-center rounded-full border border-amber/40 bg-bg font-display text-sm font-semibold text-amber">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="font-display text-xl font-semibold">{t(`steps.${step}.title`)}</h3>
              <p className="max-w-xs leading-relaxed text-muted">{t(`steps.${step}.text`)}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
