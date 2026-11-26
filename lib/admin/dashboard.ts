import "server-only";
import { addDaysIso, vilniusDayStart, vilniusToday } from "@/lib/dates";
import { DEFAULT_PRICING, DEFAULT_RENTAL_RULES } from "@/lib/data/defaults";
import { pricingSchema, rentalRulesSchema, resolveCarTerms } from "@/lib/db/json";
import { parseRange, rangeLiteral, type Range } from "@/lib/db/range";
import { availableModes } from "@/lib/pricing/calculate";
import type { Staff } from "./auth";
import { dayBoundsOf, isWholeDays } from "./format";

type Db = Staff["supabase"];

const DAY = 86_400_000;
export const UTILIZATION_DAYS = 30;

export type DayEntry = {
  id: string;
  number: number;
  car: string;
  plate: string | null;
  customer: string;
  phone: string;
  range: Range;
  /** What happens on this day: pickup, last day, ongoing or an hourly slot. */
  kind: "start" | "last" | "ongoing" | "startAndLast" | "hourly";
};

function entryKind(range: Range, day: string): DayEntry["kind"] {
  if (!isWholeDays(range)) return "hourly";
  const { first, last } = dayBoundsOf(range);
  if (first === day && last === day) return "startAndLast";
  if (first === day) return "start";
  if (last === day) return "last";
  return "ongoing";
}

export async function getDashboard(db: Db) {
  const today = vilniusToday();
  const tomorrow = addDaysIso(today, 1);
  const todayStart = vilniusDayStart(today);
  const windowEnd = vilniusDayStart(addDaysIso(today, UTILIZATION_DAYS));

  const [pending, pendingCount, soon, upcoming, cars, published, terms] = await Promise.all([
    db
      .from("bookings")
      .select(
        "id, number, period, created_at, customer_first_name, customer_last_name, total_price, car:cars!bookings_car_id_fkey ( title_lt )",
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(6),
    db.from("bookings").select("id", { count: "exact", head: true }).eq("status", "pending"),
    db
      .from("bookings")
      .select(
        "id, number, period, customer_first_name, customer_last_name, customer_phone, car:cars!bookings_car_id_fkey ( title_lt, plate )",
      )
      .eq("status", "confirmed")
      .overlaps("period", rangeLiteral(todayStart, vilniusDayStart(addDaysIso(today, 2)))),
    db
      .from("bookings")
      .select("car_id, period")
      .eq("status", "confirmed")
      .overlaps("period", rangeLiteral(todayStart, windowEnd)),
    db.from("cars").select("id", { count: "exact", head: true }).eq("status", "published"),
    db
      .from("cars")
      .select(
        "id, title_lt, price_overrides, rental_rules, deposit, category:categories ( default_pricing, default_rental_rules )",
      )
      .eq("status", "published"),
    db.from("settings").select("key, value").in("key", ["pricing", "rental_rules"]),
  ]);
  for (const r of [pending, pendingCount, soon, upcoming, cars, published, terms]) if (r.error) throw r.error;

  // Published cars that can't be booked online: no tariff left enabled after inheritance.
  const setting = (key: string) => terms.data?.find((row) => row.key === key)?.value;
  const globalPricing = pricingSchema.safeParse(setting("pricing"));
  const globalRules = rentalRulesSchema.safeParse(setting("rental_rules"));
  const unbookableCars = (published.data ?? [])
    .filter((car) => {
      const resolved = resolveCarTerms({
        globalPricing: globalPricing.success ? globalPricing.data : DEFAULT_PRICING,
        globalRules: globalRules.success ? globalRules.data : DEFAULT_RENTAL_RULES,
        categoryPricing: car.category?.default_pricing,
        categoryRules: car.category?.default_rental_rules,
        carPricing: car.price_overrides,
        carRules: car.rental_rules,
        carDeposit: car.deposit,
      });
      const modes = availableModes(resolved.pricing, resolved.rules);
      return !modes.days && !modes.hourly;
    })
    .map((car) => ({ id: car.id, title: car.title_lt }));

  const soonRows = (soon.data ?? []).map((b) => ({ ...b, range: parseRange(b.period) }));
  const forDay = (day: string): DayEntry[] => {
    const start = vilniusDayStart(day).getTime();
    const end = vilniusDayStart(addDaysIso(day, 1)).getTime();
    return soonRows
      .filter((b) => b.range.start.getTime() < end && b.range.end.getTime() > start)
      .sort((a, b) => a.range.start.getTime() - b.range.start.getTime())
      .map((b) => ({
        id: b.id,
        number: b.number,
        car: b.car?.title_lt ?? "—",
        plate: b.car?.plate ?? null,
        customer: `${b.customer_first_name} ${b.customer_last_name}`,
        phone: b.customer_phone,
        range: b.range,
        kind: entryKind(b.range, day),
      }));
  };

  // Utilization: confirmed rental time of published cars in the next 30 days.
  const carCount = cars.count ?? 0;
  const windowStart = todayStart.getTime();
  const windowStop = windowEnd.getTime();
  const upcomingRows = (upcoming.data ?? []).map((b) => ({ car: b.car_id, ...parseRange(b.period) }));
  const bookedMs = upcomingRows.reduce(
    (sum, b) => sum + Math.max(0, Math.min(b.end.getTime(), windowStop) - Math.max(b.start.getTime(), windowStart)),
    0,
  );
  const utilization = carCount > 0 ? Math.round((bookedMs / (carCount * UTILIZATION_DAYS * DAY)) * 100) : 0;

  const todayEnd = vilniusDayStart(tomorrow).getTime();
  const rentedToday = new Set(
    upcomingRows.filter((b) => b.start.getTime() < todayEnd && b.end.getTime() > windowStart).map((b) => b.car),
  ).size;
  const weekEnd = vilniusDayStart(addDaysIso(today, 7)).getTime();
  const pickupsThisWeek = upcomingRows.filter(
    (b) => b.start.getTime() >= windowStart && b.start.getTime() < weekEnd,
  ).length;

  return {
    today,
    tomorrow,
    pending: (pending.data ?? []).map((b) => ({ ...b, range: parseRange(b.period) })),
    pendingCount: pendingCount.count ?? 0,
    unbookableCars,
    todayEntries: forDay(today),
    tomorrowEntries: forDay(tomorrow),
    utilization,
    rentedToday,
    carCount,
    pickupsThisWeek,
  };
}
