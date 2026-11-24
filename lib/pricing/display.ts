import type { Pricing } from "@/lib/db/json";

/**
 * Display helpers for tariffs (the booking price calculation lives in phase 5).
 */

/** Cheapest advertised daily price: the daily tariff, else weekly / 7, else long-term / 7. */
export function fromPricePerDay(pricing: Pricing): number | null {
  if (pricing.daily.enabled) return pricing.daily.price;
  if (pricing.weekly.enabled) return Math.round(pricing.weekly.price / 7);
  if (pricing.long_term.enabled) return Math.round(pricing.long_term.price_per_week / 7);
  return null;
}

/** Per-day equivalent of a weekly price, rounded to 0.5 €. */
export function perDayEquivalent(weeklyPrice: number) {
  return Math.round((weeklyPrice / 7) * 2) / 2;
}

/** Saving of a weekly price vs. paying the daily tariff for 7 days, in whole percent. */
export function weeklySavingPercent(dailyPrice: number, weeklyPrice: number) {
  if (dailyPrice <= 0) return 0;
  return Math.max(0, Math.round((1 - weeklyPrice / (dailyPrice * 7)) * 100));
}
