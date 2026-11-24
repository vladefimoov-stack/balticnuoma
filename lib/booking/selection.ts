import { addDaysIso, vilniusToday } from "@/lib/dates";
import type { Pricing, RentalRules } from "@/lib/db/json";
import { quoteDays, quoteHours, type QuoteResult } from "@/lib/pricing/calculate";
import {
  dayRangeInterval,
  daysBetween,
  HOURLY_FIRST_START,
  HOURLY_LAST_END,
  hourlyInterval,
  type Interval,
} from "./availability";
import type { Selection } from "./schema";

/** How far ahead a booking may start / end. */
export const BOOKING_HORIZON_DAYS = 365;
/** Hourly rentals must start at least this long from now. */
export const HOURLY_LEAD_MS = 3_600_000;

/** The occupied period: whole Vilnius days (last day inclusive) or the hourly slot. */
export function selectionInterval(selection: Selection): Interval {
  return selection.mode === "days"
    ? dayRangeInterval(selection.startDate, addDaysIso(selection.endDate, 1))
    : hourlyInterval(selection.date, selection.startHour, selection.hours);
}

export function selectionDays(selection: Extract<Selection, { mode: "days" }>) {
  return daysBetween(selection.startDate, selection.endDate) + 1;
}

export function quoteSelection(pricing: Pricing, rules: RentalRules, selection: Selection): QuoteResult {
  return selection.mode === "days"
    ? quoteDays(pricing, rules, selectionDays(selection))
    : quoteHours(pricing, rules, selection.hours);
}

/** Calendar sanity: not in the past, not beyond the horizon, hourly within opening of the day. */
export function checkSelectionTiming(
  selection: Selection,
  now = Date.now(),
): "past" | "too_far" | "hours_range" | null {
  const today = vilniusToday(new Date(now));
  const horizon = addDaysIso(today, BOOKING_HORIZON_DAYS);

  if (selection.mode === "days") {
    if (selection.endDate < selection.startDate) return "past";
    if (selection.startDate < today) return "past";
    if (selection.endDate > horizon) return "too_far";
    return null;
  }

  if (selection.startHour < HOURLY_FIRST_START || selection.startHour + selection.hours > HOURLY_LAST_END) {
    return "hours_range";
  }
  if (selection.date > horizon) return "too_far";
  if (selectionInterval(selection).start < now + HOURLY_LEAD_MS) return "past";
  return null;
}
