import { TZDate } from "@date-fns/tz";
import { addDaysIso, TIME_ZONE, vilniusDayStart } from "@/lib/dates";

/**
 * Availability maths on busy intervals (epoch ms, half-open [start, end)).
 * Pure functions shared by the calendar (client) and the booking action (server).
 * Day boundaries are Vilnius midnights, so DST days (23 h / 25 h) are handled.
 */

export type Interval = { start: number; end: number };
export type DayStatus = "free" | "partial" | "busy";

/** Hourly rentals may start from this hour and must end by midnight. */
export const HOURLY_FIRST_START = 7;
export const HOURLY_LAST_END = 24;

const HOUR = 3_600_000;

export function dayBounds(isoDate: string): Interval {
  return { start: vilniusDayStart(isoDate).getTime(), end: vilniusDayStart(addDaysIso(isoDate, 1)).getTime() };
}

export function overlaps(a: Interval, b: Interval) {
  return a.start < b.end && b.start < a.end;
}

/** Merge overlapping / touching intervals (sorted by start). */
export function mergeIntervals(intervals: Interval[]): Interval[] {
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const out: Interval[] = [];
  for (const i of sorted) {
    const last = out[out.length - 1];
    if (last && i.start <= last.end) last.end = Math.max(last.end, i.end);
    else out.push({ ...i });
  }
  return out;
}

export function dayStatus(isoDate: string, busy: Interval[]): DayStatus {
  const day = dayBounds(isoDate);
  let covered = 0;
  for (const i of mergeIntervals(busy)) {
    if (!overlaps(i, day)) continue;
    covered += Math.min(i.end, day.end) - Math.max(i.start, day.start);
  }
  if (covered <= 0) return "free";
  return covered >= day.end - day.start ? "busy" : "partial";
}

/** A day-rental period: from the pickup day's midnight to the return day's midnight. */
export function dayRangeInterval(startDate: string, endDate: string): Interval {
  return { start: vilniusDayStart(startDate).getTime(), end: vilniusDayStart(endDate).getTime() };
}

export function hourlyInterval(date: string, startHour: number, hours: number): Interval {
  const [y, m, d] = date.split("-").map(Number);
  const start = new TZDate(y, m - 1, d, startHour, 0, 0, TIME_ZONE).getTime();
  return { start, end: start + hours * HOUR };
}

export function isIntervalFree(interval: Interval, busy: Interval[]) {
  return !busy.some((b) => overlaps(b, interval));
}

/** Number of nights between two "YYYY-MM-DD" dates (calendar days, DST-safe). */
export function daysBetween(startDate: string, endDate: string) {
  const [y1, m1, d1] = startDate.split("-").map(Number);
  const [y2, m2, d2] = endDate.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

/** Start hours on `date` where an `hours`-long rental fits, is free and starts at least 1 h from now. */
export function freeStartHours(date: string, hours: number, busy: Interval[], now = Date.now()): number[] {
  const result: number[] = [];
  for (let h = HOURLY_FIRST_START; h + hours <= HOURLY_LAST_END; h++) {
    const interval = hourlyInterval(date, h, hours);
    if (interval.start < now + HOUR) continue;
    if (isIntervalFree(interval, busy)) result.push(h);
  }
  return result;
}
