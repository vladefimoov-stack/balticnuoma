import {
  BatteryCharging,
  Calendar,
  Car,
  Cog,
  DoorOpen,
  Fuel,
  Gauge,
  Leaf,
  Package,
  Route,
  Sparkles,
  Timer,
  Users,
  type LucideIcon,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { CarDetail } from "@/lib/data/cars";

type Row = { key: string; icon: LucideIcon; label: string; value: string };

const num = (value: number, locale: string) =>
  new Intl.NumberFormat(locale === "lt" ? "lt-LT" : "en-GB", { maximumFractionDigits: 1 }).format(value);

/** Standard specs + free "label — value" rows from the admin. */
export async function CarSpecs({ car, locale }: { car: CarDetail; locale: string }) {
  const t = await getTranslations("specs");
  const s = car.specs;
  const en = locale === "en";

  const rows: Row[] = [];
  const add = (key: string, icon: LucideIcon, value: string | 0 | null | undefined | false) => {
    if (value) rows.push({ key, icon, label: t(`labels.${key}` as Parameters<typeof t>[0]), value });
  };

  add("body", Car, car.bodyType && t(`values.body.${car.bodyType}`));
  add("year", Calendar, car.year && String(car.year));
  add("fuel", Fuel, s.fuel && t(`values.fuel.${s.fuel}`));
  add("transmission", Cog, s.transmission && t(`values.transmission.${s.transmission}`));
  add("drive", Route, s.drive && t(`values.drive.${s.drive}`));
  add("engine", Gauge, s.engine_l && t("units.liters", { value: num(s.engine_l, locale) }));
  add("power", Gauge, s.power_hp && t("units.hp", { value: s.power_hp }));
  add(
    "acceleration",
    Timer,
    s.acceleration_0_100_s && t("units.seconds", { value: num(s.acceleration_0_100_s, locale) }),
  );
  add("consumption", Leaf, s.consumption_l_100km && t("units.l100", { value: num(s.consumption_l_100km, locale) }));
  add(
    "consumptionElectric",
    BatteryCharging,
    s.consumption_kwh_100km && t("units.kwh100", { value: num(s.consumption_kwh_100km, locale) }),
  );
  add("range", BatteryCharging, s.range_km && t("units.km", { value: s.range_km }));
  add("seats", Users, s.seats && String(s.seats));
  add("doors", DoorOpen, s.doors && String(s.doors));
  add("trunk", Package, s.trunk_l && t("units.liters", { value: s.trunk_l }));
  add("livery", Sparkles, s.livery && (s.livery === "ride_hailing" ? t("values.livery.ride_hailing") : s.livery));

  const custom = car.customSpecs.map((c, i) => ({
    key: `custom-${i}`,
    label: (en && c.label_en) || c.label_lt,
    value: (en && c.value_en) || c.value_lt,
  }));

  if (rows.length === 0 && custom.length === 0) return null;

  return (
    <dl className="grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2">
      {rows.map(({ key, icon: Icon, label, value }) => (
        <div key={key} className="flex items-center gap-4 bg-surface px-5 py-4">
          <Icon className="size-5 shrink-0 text-amber/80" aria-hidden />
          <dt className="text-sm text-muted">{label}</dt>
          <dd className="ml-auto text-right text-sm font-medium">{value}</dd>
        </div>
      ))}
      {custom.map(({ key, label, value }) => (
        <div key={key} className="flex items-center gap-4 bg-surface px-5 py-4">
          <Sparkles className="size-5 shrink-0 text-amber/80" aria-hidden />
          <dt className="text-sm text-muted">{label}</dt>
          <dd className="ml-auto text-right text-sm font-medium">{value}</dd>
        </div>
      ))}
      {(rows.length + custom.length) % 2 === 1 && <div className="hidden bg-surface sm:block" aria-hidden />}
    </dl>
  );
}
