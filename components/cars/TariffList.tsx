import { getTranslations } from "next-intl/server";
import { CountUp } from "@/components/ui/CountUp";
import type { Pricing } from "@/lib/db/json";
import { perDayEquivalent, weeklySavingPercent } from "@/lib/pricing/display";
import { cn } from "@/lib/utils/cn";

type TariffListProps = {
  pricing: Pricing;
  deposit: number;
  locale: string;
  /** "cards" — big tiles (home / prices page), "rows" — compact list (car page). */
  variant?: "cards" | "rows";
  className?: string;
};

type Tariff = { key: string; name: string; price: number; unit: string; note?: string; badge?: string };

export async function TariffList({ pricing, deposit, locale, variant = "cards", className }: TariffListProps) {
  const t = await getTranslations("tariffs");
  const tariffs: Tariff[] = [];

  if (pricing.hourly.enabled) {
    tariffs.push({
      key: "hourly",
      name: t("hourly"),
      price: pricing.hourly.price,
      unit: t("perHour"),
      note: t("minHours", { count: pricing.hourly.min_hours }),
    });
  }
  if (pricing.daily.enabled) {
    tariffs.push({
      key: "daily",
      name: t("daily"),
      price: pricing.daily.price,
      unit: t("perDay"),
      note: t("dailyNote"),
    });
  }
  if (pricing.weekly.enabled) {
    const save = pricing.daily.enabled ? weeklySavingPercent(pricing.daily.price, pricing.weekly.price) : 0;
    tariffs.push({
      key: "weekly",
      name: t("weekly"),
      price: pricing.weekly.price,
      unit: t("perWeek"),
      note: t("perDayEquivalent", { price: perDayEquivalent(pricing.weekly.price) }),
      badge: save > 0 ? t("save", { percent: save }) : undefined,
    });
  }
  if (pricing.long_term.enabled) {
    const save = pricing.daily.enabled ? weeklySavingPercent(pricing.daily.price, pricing.long_term.price_per_week) : 0;
    tariffs.push({
      key: "long_term",
      name: t("longTerm"),
      price: pricing.long_term.price_per_week,
      unit: t("perWeek"),
      note: t("fromWeeks", { count: pricing.long_term.min_weeks }),
      badge: save > 0 ? t("save", { percent: save }) : undefined,
    });
  }

  if (variant === "rows") {
    return (
      <dl className={cn("divide-y divide-line overflow-hidden rounded-card border border-line bg-surface", className)}>
        {tariffs.map((tariff) => (
          <div key={tariff.key} className="flex items-baseline gap-3 px-5 py-4">
            <dt>
              <span className="text-sm font-medium">{tariff.name}</span>
              {tariff.note && <span className="block text-xs text-muted">{tariff.note}</span>}
            </dt>
            <dd className="ml-auto text-right whitespace-nowrap">
              <span className="font-display text-lg font-semibold">{tariff.price} €</span>
              <span className="text-sm text-muted"> {tariff.unit}</span>
            </dd>
          </div>
        ))}
        <div className="flex items-baseline gap-3 bg-surface-2 px-5 py-4">
          <dt className="text-sm font-medium">
            {t("deposit")}
            <span className="block text-xs font-normal text-muted">{t("depositNote")}</span>
          </dt>
          <dd className="ml-auto font-display text-lg font-semibold">{deposit} €</dd>
        </div>
      </dl>
    );
  }

  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {tariffs.map((tariff) => (
        <div
          key={tariff.key}
          className="relative flex flex-col gap-6 overflow-hidden rounded-card border border-line bg-surface p-6"
        >
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-semibold tracking-[0.14em] text-muted uppercase">{tariff.name}</h3>
            {tariff.badge && (
              <span className="rounded-pill bg-amber/12 px-2.5 py-1 text-xs font-semibold text-amber">
                {tariff.badge}
              </span>
            )}
          </div>
          <p className="leading-none">
            <CountUp value={tariff.price} locale={locale} className="font-display text-5xl font-semibold" />
            <span className="ml-1 font-display text-2xl font-semibold">€</span>
            <span className="mt-2 block text-sm text-muted">{tariff.unit}</span>
          </p>
          {tariff.note && <p className="mt-auto border-t border-line pt-4 text-sm text-muted">{tariff.note}</p>}
        </div>
      ))}
    </div>
  );
}
