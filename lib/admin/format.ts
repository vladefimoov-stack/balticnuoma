import { TZDate } from "@date-fns/tz";
import { daysBetween } from "@/lib/booking/availability";
import { formatSelection } from "@/lib/booking/format";
import { addDaysIso, TIME_ZONE, vilniusDayStart, vilniusToday } from "@/lib/dates";
import type { Range } from "@/lib/db/range";

/* Lithuanian formatting for the admin panel (always Europe/Vilnius). */

const dateTime = new Intl.DateTimeFormat("lt-LT", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const shortDate = new Intl.DateTimeFormat("lt-LT", { timeZone: TIME_ZONE, month: "short", day: "numeric" });

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  return dateTime.format(new Date(value));
}

export function formatShortDate(isoDate: string) {
  return shortDate.format(new Date(`${isoDate}T12:00:00Z`));
}

/** Vilnius calendar date ("YYYY-MM-DD") of an instant. */
export function vilniusDate(value: Date | number) {
  return vilniusToday(new Date(value));
}

function vilniusTime(value: Date) {
  const z = new TZDate(value.getTime(), TIME_ZONE);
  return `${String(z.getHours()).padStart(2, "0")}:${String(z.getMinutes()).padStart(2, "0")}`;
}

/** Day rentals start and end at Vilnius midnight; anything else is an hourly / custom period. */
export function isWholeDays(range: Range) {
  return (
    vilniusDayStart(vilniusDate(range.start)).getTime() === range.start.getTime() &&
    vilniusDayStart(vilniusDate(range.end)).getTime() === range.end.getTime()
  );
}

/** First and last day (inclusive) of a whole-day range. */
export function dayBoundsOf(range: Range) {
  const first = vilniusDate(range.start);
  const last = addDaysIso(vilniusDate(range.end), -1);
  return { first, last, days: daysBetween(first, last) + 1 };
}

/** "2026 m. gruodžio 3–4 d." or "2026 m. gruodžio 3 d., 10:00–14:00". */
export function formatRange(range: Range) {
  if (isWholeDays(range)) {
    const { first, last } = dayBoundsOf(range);
    return formatSelection({ mode: "days", startDate: first, endDate: last }, "lt");
  }
  const startDay = vilniusDate(range.start);
  const endDay = vilniusDate(range.end);
  const datePart = formatSelection({ mode: "days", startDate: startDay, endDate: startDay }, "lt");
  if (startDay === endDay || vilniusTime(range.end) === "00:00") {
    return `${datePart}, ${vilniusTime(range.start)}–${vilniusTime(range.end) === "00:00" ? "24:00" : vilniusTime(range.end)}`;
  }
  return `${formatDateTime(range.start)} – ${formatDateTime(range.end)}`;
}

/** "3 paros" / "4 val." */
export function formatDuration(range: Range) {
  if (isWholeDays(range)) {
    const { days } = dayBoundsOf(range);
    const mod10 = days % 10;
    const mod100 = days % 100;
    const word =
      mod10 === 1 && mod100 !== 11
        ? "para"
        : mod10 >= 2 && mod10 <= 9 && (mod100 < 12 || mod100 > 19)
          ? "paros"
          : "parų";
    return `${days} ${word}`;
  }
  const hours = Math.round((range.end.getTime() - range.start.getTime()) / 3_600_000);
  return `${hours} val.`;
}

export const RENTAL_TYPE_LABEL = {
  hourly: "Valandinė",
  daily: "Paros",
  weekly: "Savaitės",
  long_term: "Ilgalaikė",
} as const;

export function formatMoney(value: number | string | null | undefined) {
  if (value === null || value === undefined) return "—";
  const n = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("lt-LT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);
}
