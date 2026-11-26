import { BadgeCheck, CalendarRange, Gauge, ShieldCheck, Zap, type LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Spotlight } from "@/components/ui/Spotlight";
import { cn } from "@/lib/utils/cn";

const ITEMS: Array<{ key: "mileage" | "insurance" | "maintained" | "flexible" | "fast"; icon: LucideIcon }> = [
  { key: "mileage", icon: Gauge },
  { key: "insurance", icon: ShieldCheck },
  { key: "maintained", icon: BadgeCheck },
  { key: "flexible", icon: CalendarRange },
  { key: "fast", icon: Zap },
];

export async function Advantages() {
  const t = await getTranslations("advantages");

  return (
    <section id="privalumai" className="container-site py-24 md:py-32">
      <SectionHeading
        eyebrow={t("eyebrow")}
        title={t("title")}
        highlight={t("highlight").split(" ")}
        description={t("description")}
      />
      <ul className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        {ITEMS.map(({ key, icon: Icon }, i) => (
          <Reveal as="li" key={key} delay={i} className={cn(i < 2 ? "lg:col-span-3" : "lg:col-span-2")}>
            <Spotlight className="h-full rounded-card">
              <div className="flex h-full flex-col gap-5 rounded-card border border-line bg-surface p-7">
                <span className="grid size-12 place-items-center rounded-full border border-amber/30 bg-amber/8 text-amber">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="font-display text-lg font-semibold">{t(`items.${key}.title`)}</h3>
                <p className="leading-relaxed text-muted">{t(`items.${key}.text`)}</p>
              </div>
            </Spotlight>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
