import type { OpeningHours } from "@/lib/data/defaults";

const DAY_LABELS: Record<string, string[]> = {
  lt: ["I", "II", "III", "IV", "V", "VI", "VII"],
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
};

const trimHour = (t: string) => t.replace(/^0(\d)/, "$1");

/** Group consecutive weekdays: [1,2,3,4,5] → "I–V" (lt) / "Mon–Fri" (en). */
function formatDays(days: number[], locale: string) {
  const labels = DAY_LABELS[locale] ?? DAY_LABELS.en;
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (const day of [...sorted.slice(1), Number.NaN]) {
    if (day === prev + 1) {
      prev = day;
      continue;
    }
    ranges.push(start === prev ? labels[start - 1] : `${labels[start - 1]}–${labels[prev - 1]}`);
    start = day;
    prev = day;
  }
  return ranges.join(", ");
}

/** ["I–V 9:00–18:00", …] */
export function formatOpeningHours(hours: OpeningHours, locale: string): string[] {
  return hours.map((h) => `${formatDays(h.days, locale)} ${trimHour(h.opens)}–${trimHour(h.closes)}`);
}
