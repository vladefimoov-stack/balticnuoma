import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { CarCard } from "@/components/cars/CarCard";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { CarListItem } from "@/lib/data/cars";

const MAX_CARDS = 6;

export async function FleetPreview({ cars, locale }: { cars: CarListItem[]; locale: string }) {
  const t = await getTranslations("fleet");

  return (
    <section id="automobiliu-parkas" className="container-site py-24 md:py-32">
      <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
        <SectionHeading eyebrow={t("eyebrow")} title={t("title")} highlight={t("highlight").split(" ")} />
        <ButtonLink href="/automobiliai" variant="secondary" className="self-start md:self-auto">
          {t("all")}
          <ArrowRight className="size-4" aria-hidden />
        </ButtonLink>
      </div>

      {cars.length > 0 ? (
        <ul className="mt-14 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {cars.slice(0, MAX_CARDS).map((car, i) => (
            <Reveal as="li" key={car.id} delay={i % 3}>
              <CarCard car={car} locale={locale} />
            </Reveal>
          ))}
        </ul>
      ) : (
        <p className="mt-14 rounded-card border border-line bg-surface p-8 text-muted">{t("empty")}</p>
      )}
    </section>
  );
}
