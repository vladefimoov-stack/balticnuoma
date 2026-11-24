import { TZDate } from "@date-fns/tz";

/** All business dates are in Lithuanian time. */
export const TIME_ZONE = "Europe/Vilnius";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** Midnight (start of day) in Vilnius for a "YYYY-MM-DD" date, as an absolute instant. */
export function vilniusDayStart(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(new TZDate(y, m - 1, d, 0, 0, 0, TIME_ZONE).getTime());
}

/** Today's date in Vilnius as "YYYY-MM-DD". */
export function vilniusToday(now: Date = new Date()): string {
  const z = new TZDate(now.getTime(), TIME_ZONE);
  return `${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, "0")}-${String(z.getDate()).padStart(2, "0")}`;
}

/** "YYYY-MM-DD" + n days (calendar arithmetic, DST-safe). */
export function addDaysIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}
