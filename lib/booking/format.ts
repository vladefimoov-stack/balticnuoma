import { TIME_ZONE, vilniusDayStart } from "@/lib/dates";
import type { Selection } from "./schema";

/** Human booking reference: 123 → "BN-000123". */
export function bookingNumber(n: number | string) {
  return `BN-${String(n).padStart(6, "0")}`;
}

const intlLocale = (locale: string) => (locale === "en" ? "en-GB" : "lt-LT");
const hour = (h: number) => `${String(h).padStart(2, "0")}:00`;

/** Noon of a Vilnius day — a safe instant to format a calendar date in any time zone. */
function vilniusNoon(isoDate: string) {
  return new Date(vilniusDayStart(isoDate).getTime() + 12 * 3_600_000);
}

/** "2030 m. gruodžio 1–2 d." / "1–2 December 2030" or "5 December 2030, 10:00–14:00". */
export function formatSelection(selection: Selection, locale: string) {
  const dates = new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  if (selection.mode === "days") {
    const start = vilniusNoon(selection.startDate);
    if (selection.startDate === selection.endDate) return dates.format(start);
    const end = vilniusNoon(selection.endDate);
    if (locale !== "en") return lithuanianRange(dates, start, end);
    return dates.formatRange(start, end);
  }
  return `${dates.format(vilniusNoon(selection.date))}, ${hour(selection.startHour)}–${hour(selection.startHour + selection.hours)}`;
}

/**
 * ICU's Lithuanian ranges drop "m." / "d." ("2026 gruodžio 12–20"); the standard
 * form is "2026 m. gruodžio 12–20 d." / "2026 m. gruodžio 28 d. – sausio 3 d.".
 */
function lithuanianRange(dates: Intl.DateTimeFormat, start: Date, end: Date) {
  const part = (date: Date, type: Intl.DateTimeFormatPartTypes) =>
    dates.formatToParts(date).find((p) => p.type === type)?.value ?? "";
  const [y1, m1, d1] = [part(start, "year"), part(start, "month"), part(start, "day")];
  const [y2, m2, d2] = [part(end, "year"), part(end, "month"), part(end, "day")];
  if (y1 !== y2) return `${dates.format(start)} – ${dates.format(end)}`;
  if (m1 !== m2) return `${y1} m. ${m1} ${d1} d. – ${m2} ${d2} d.`;
  return `${y1} m. ${m1} ${d1}–${d2} d.`;
}

export function formatPrice(value: number, locale: string) {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}
