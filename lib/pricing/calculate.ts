import type { Pricing, RentalRules } from "@/lib/db/json";

/**
 * Booking price calculation — shared by the booking widget (live quote) and the
 * server action (authoritative re-calculation). Pure functions, no dependencies.
 *
 * Day rentals pick the cheapest valid combination ("9 days = 1 week + 2 days"):
 *  - daily:     days × daily price
 *  - weekly:    full weeks × weekly price + leftover days (daily price, or a whole
 *               extra week if that is cheaper)
 *  - long-term: from N weeks: full weeks × long-term weekly price + leftover days
 *               pro rata (weekly price / 7)
 */

export type RentalType = "hourly" | "daily" | "weekly" | "long_term";

export type PriceLine = {
  kind: "hours" | "days" | "weeks" | "longTermWeeks" | "longTermDays" | "extraWeek";
  quantity: number;
  unitPrice: number;
  total: number;
};

export type Quote = {
  rentalType: RentalType;
  total: number;
  lines: PriceLine[];
  days?: number;
  hours?: number;
};

export type QuoteResult =
  | { ok: true; quote: Quote }
  | { ok: false; reason: "not_available" | "min_days" | "min_hours" | "too_long"; min?: number; max?: number };

export const MAX_RENTAL_DAYS = 365;
export const MAX_RENTAL_HOURS = 24;

const money = (n: number) => Math.round(n * 100) / 100;
const line = (kind: PriceLine["kind"], quantity: number, unitPrice: number): PriceLine => ({
  kind,
  quantity,
  unitPrice: money(unitPrice),
  total: money(quantity * unitPrice),
});

function allowed(rules: RentalRules, type: RentalType) {
  return !rules.allowed_rental_types || rules.allowed_rental_types.includes(type);
}

/** Which booking modes the widget should offer for this car. */
export function availableModes(pricing: Pricing, rules: RentalRules) {
  const hourly = pricing.hourly.enabled && allowed(rules, "hourly");
  const days =
    (pricing.daily.enabled && allowed(rules, "daily")) ||
    (pricing.weekly.enabled && allowed(rules, "weekly")) ||
    (pricing.long_term.enabled && allowed(rules, "long_term"));
  return { hourly, days };
}

export function quoteHours(pricing: Pricing, rules: RentalRules, hours: number): QuoteResult {
  if (!availableModes(pricing, rules).hourly) return { ok: false, reason: "not_available" };
  if (hours < pricing.hourly.min_hours) return { ok: false, reason: "min_hours", min: pricing.hourly.min_hours };
  if (hours > MAX_RENTAL_HOURS) return { ok: false, reason: "too_long", max: MAX_RENTAL_HOURS };
  const lines = [line("hours", hours, pricing.hourly.price)];
  return { ok: true, quote: { rentalType: "hourly", total: lines[0].total, lines, hours } };
}

export function quoteDays(pricing: Pricing, rules: RentalRules, days: number): QuoteResult {
  if (!Number.isInteger(days) || days < 1) return { ok: false, reason: "min_days", min: 1 };
  if (rules.min_rental_days && days < rules.min_rental_days) {
    return { ok: false, reason: "min_days", min: rules.min_rental_days };
  }
  if (days > MAX_RENTAL_DAYS) return { ok: false, reason: "too_long", max: MAX_RENTAL_DAYS };

  const dailyOk = pricing.daily.enabled && allowed(rules, "daily");
  const weeklyOk = pricing.weekly.enabled && allowed(rules, "weekly");
  const longOk =
    pricing.long_term.enabled && allowed(rules, "long_term") && days >= pricing.long_term.min_weeks * 7;

  const candidates: Quote[] = [];
  const weeks = Math.floor(days / 7);
  const rest = days % 7;

  if (dailyOk) {
    const lines = [line("days", days, pricing.daily.price)];
    candidates.push({ rentalType: "daily", total: lines[0].total, lines, days });
  }

  if (weeklyOk) {
    const W = pricing.weekly.price;
    const lines: PriceLine[] = [];
    if (weeks > 0) lines.push(line("weeks", weeks, W));
    if (rest > 0) {
      // Leftover days: daily tariff, or a whole extra week if that is cheaper / the only option.
      const restByDay = dailyOk ? rest * pricing.daily.price : Number.POSITIVE_INFINITY;
      lines.push(restByDay <= W ? line("days", rest, pricing.daily.price) : line("extraWeek", 1, W));
    }
    const total = money(lines.reduce((sum, l) => sum + l.total, 0));
    candidates.push({ rentalType: "weekly", total, lines, days });
  }

  if (longOk) {
    const LT = pricing.long_term.price_per_week;
    const lines: PriceLine[] = [line("longTermWeeks", weeks, LT)];
    if (rest > 0) lines.push(line("longTermDays", rest, LT / 7));
    const total = money(lines.reduce((sum, l) => sum + l.total, 0));
    candidates.push({ rentalType: "long_term", total, lines, days });
  }

  if (candidates.length === 0) return { ok: false, reason: "not_available" };
  // Cheapest wins; on a tie keep the simpler tariff (array order: daily → weekly → long-term).
  const best = candidates.reduce((a, b) => (b.total < a.total ? b : a));
  return { ok: true, quote: best };
}
