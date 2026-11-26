import { getTranslations } from "next-intl/server";
import type { Pricing } from "@/lib/db/json";
import { perDayEquivalent } from "@/lib/pricing/display";
import { cn } from "@/lib/utils/cn";

type TariffListProps = {
  pricing: Pricing;
  deposit: number;
  className?: string;
};

type Tariff = { key: string; name: string; price: number; unit: string; note?: string };

/** Compact list of the car's enabled tariffs + deposit (car page sidebar). */
export async function TariffList({ pricing, deposit, className }: TariffListProps) {
  const t = await getTranslations("tariffs");
  const tc = await getTranslations("cars");
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
    tariffs.push({
      key: "weekly",
      name: t("weekly"),
      price: pricing.weekly.price,
      unit: t("perWeek"),
      note: t("perDayEquivalent", { price: perDayEquivalent(pricing.weekly.price) }),
    });
  }
  if (pricing.long_term.enabled) {
    tariffs.push({
      key: "long_term",
      name: t("longTerm"),
      price: pricing.long_term.price_per_week,
      unit: t("perWeek"),
      note: t("fromWeeks", { count: pricing.long_term.min_weeks }),
    });
  }

  return (
    <dl className={cn("divide-y divide-line overflow-hidden rounded-card border border-line bg-surface", className)}>
      {tariffs.length === 0 && (
        <div className="px-5 py-4 text-sm text-muted">
          <dt className="sr-only">{t("perDay")}</dt>
          <dd>{tc("priceOnRequest")}</dd>
        </div>
      )}
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
