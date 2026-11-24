import { CalendarDays, Gauge, IdCard, UserCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { RentalRules } from "@/lib/db/json";

/** Driver requirements and rental limits for a car / category. */
export async function RulesList({ rules }: { rules: RentalRules }) {
  const t = await getTranslations("rules");
  const items = [
    { icon: UserCheck, text: t("minAge", { age: rules.min_age }) },
    { icon: IdCard, text: t("experience", { years: rules.min_license_years }) },
    {
      icon: Gauge,
      text: rules.mileage_limit_km_per_day
        ? t("mileageLimit", { km: rules.mileage_limit_km_per_day })
        : t("mileageUnlimited"),
    },
    ...(rules.min_rental_days
      ? [{ icon: CalendarDays, text: t("minRentalDays", { days: rules.min_rental_days }) }]
      : []),
  ];

  return (
    <ul className="flex flex-col gap-3">
      {items.map(({ icon: Icon, text }) => (
        <li key={text} className="flex items-center gap-3 text-sm">
          <Icon className="size-5 shrink-0 text-amber/80" aria-hidden />
          {text}
        </li>
      ))}
    </ul>
  );
}
