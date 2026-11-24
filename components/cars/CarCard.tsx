import { ArrowUpRight, Cog, Fuel, Users } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Spotlight } from "@/components/ui/Spotlight";
import { Link } from "@/i18n/navigation";
import { pick, type CarListItem } from "@/lib/data/cars";
import { cn } from "@/lib/utils/cn";
import { CarPlaceholder } from "./CarPlaceholder";

type CarCardProps = { car: CarListItem; locale: string; priority?: boolean; className?: string };

export async function CarCard({ car, locale, priority = false, className }: CarCardProps) {
  const t = await getTranslations("cars");
  const ts = await getTranslations("specs.values");
  const title = pick(car.title, locale);
  const { specs } = car;

  const meta = [
    specs.fuel && { icon: Fuel, label: ts(`fuel.${specs.fuel}`) },
    specs.transmission && { icon: Cog, label: ts(`transmission.${specs.transmission}`) },
    specs.seats && { icon: Users, label: t("seats", { count: specs.seats }) },
  ].filter(Boolean) as Array<{ icon: typeof Fuel; label: string }>;

  return (
    <Spotlight className={cn("h-full rounded-card", className)}>
      <Link
        href={{ pathname: "/automobiliai/[slug]", params: { slug: car.slug } }}
        className="group flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface transition-colors duration-300 hover:border-line-strong"
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-linear-to-b from-surface-2 to-bg">
          {car.cover ? (
            <Image
              src={car.cover.url}
              alt={pick(car.cover.alt, locale)}
              fill
              priority={priority}
              sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw"
              className="object-cover"
              {...(car.cover.blurDataUrl ? { placeholder: "blur", blurDataURL: car.cover.blurDataUrl } : {})}
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center px-8 pt-6">
              <CarPlaceholder bodyType={car.bodyType} className="max-w-sm" />
            </div>
          )}
          <span className="absolute top-4 left-4 rounded-pill border border-line px-3 py-1 text-xs font-medium text-fg glass">
            {pick(car.category.name, locale)}
          </span>
          {car.year && (
            <span className="absolute top-4 right-4 rounded-pill border border-line px-3 py-1 text-xs text-muted glass">
              {car.year}
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-4 p-6">
          <h3 className="font-display text-lg leading-snug font-semibold">{title}</h3>
          {meta.length > 0 && (
            <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted">
              {meta.map(({ icon: Icon, label }) => (
                <li key={label} className="inline-flex items-center gap-1.5">
                  <Icon className="size-4 text-amber/80" aria-hidden />
                  {label}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-auto flex items-end justify-between gap-4 border-t border-line pt-4">
            {car.fromPerDay !== null ? (
              <p className="leading-tight">
                <span className="block text-xs text-muted">{t("from")}</span>
                <span className="font-display text-2xl font-semibold">{car.fromPerDay} €</span>
                <span className="text-sm text-muted"> / {t("day")}</span>
              </p>
            ) : (
              <p className="text-sm text-muted">{t("priceOnRequest")}</p>
            )}
            <span className="grid size-10 place-items-center rounded-full border border-line text-muted transition-colors duration-300 group-hover:border-amber group-hover:bg-amber group-hover:text-on-amber">
              <ArrowUpRight className="size-4" aria-hidden />
              <span className="sr-only">{t("details")}</span>
            </span>
          </div>
        </div>
      </Link>
    </Spotlight>
  );
}
