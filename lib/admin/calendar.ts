import "server-only";
import { addDaysIso, isIsoDate, vilniusDayStart, vilniusToday } from "@/lib/dates";
import { parseRange, rangeLiteral } from "@/lib/db/range";
import { bookingNumber } from "@/lib/booking/format";
import type { CarStatus } from "@/lib/supabase/types";
import type { Staff } from "./auth";
import { formatRange } from "./format";

type Db = Staff["supabase"];

export const CALENDAR_DAYS = 28;

export type TimelineItem = {
  id: string;
  carId: string;
  kind: "pending" | "confirmed" | "block";
  /** Position in days from the first visible day (fractional for hourly bookings). */
  start: number;
  end: number;
  label: string;
  detail: string;
  href: string | null;
  reason: string | null;
};

export type TimelineCar = { id: string; title: string; plate: string | null; status: CarStatus };

/** Monday of the week containing `iso` (calendar starts on Mondays). */
function mondayOf(iso: string) {
  const weekday = (new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7;
  return addDaysIso(iso, -weekday);
}

export function calendarStart(param: string | undefined) {
  return mondayOf(isIsoDate(param) ? param : vilniusToday());
}

export async function getCalendar(db: Db, from: string) {
  const days = Array.from({ length: CALENDAR_DAYS }, (_, i) => addDaysIso(from, i));
  const windowStart = vilniusDayStart(from);
  const windowEnd = vilniusDayStart(addDaysIso(from, CALENDAR_DAYS));
  const window = rangeLiteral(windowStart, windowEnd);

  // Day index of an instant (handles 23/25 h DST days via the real day boundaries).
  const bounds = [...days, addDaysIso(from, CALENDAR_DAYS)].map((d) => vilniusDayStart(d).getTime());
  const position = (t: number) => {
    if (t <= bounds[0]) return 0;
    if (t >= bounds[bounds.length - 1]) return CALENDAR_DAYS;
    const i = bounds.findIndex((b, k) => t >= b && t < bounds[k + 1]);
    return i + (t - bounds[i]) / (bounds[i + 1] - bounds[i]);
  };

  const [cars, bookings, blocks] = await Promise.all([
    db.from("cars").select("id, title_lt, plate, status, sort").neq("status", "draft").order("sort").order("title_lt"),
    db
      .from("bookings")
      .select("id, number, car_id, status, period, customer_first_name, customer_last_name")
      .in("status", ["pending", "confirmed"])
      .overlaps("period", window),
    db.from("blocks").select("id, car_id, period, reason").overlaps("period", window),
  ]);
  for (const r of [cars, bookings, blocks]) if (r.error) throw r.error;

  const items: TimelineItem[] = [
    ...(bookings.data ?? []).map((b) => {
      const range = parseRange(b.period);
      return {
        id: b.id,
        carId: b.car_id,
        kind: b.status === "confirmed" ? ("confirmed" as const) : ("pending" as const),
        start: position(range.start.getTime()),
        end: position(range.end.getTime()),
        label: `${b.customer_first_name} ${b.customer_last_name.charAt(0)}.`,
        detail: `${bookingNumber(b.number)} · ${formatRange(range)}`,
        href: `/admin/rezervacijos/${b.id}`,
        reason: null,
      };
    }),
    ...(blocks.data ?? []).map((b) => {
      const range = parseRange(b.period);
      return {
        id: b.id,
        carId: b.car_id,
        kind: "block" as const,
        start: position(range.start.getTime()),
        end: position(range.end.getTime()),
        label: b.reason || "Blokuota",
        detail: formatRange(range),
        href: null,
        reason: b.reason,
      };
    }),
  ];

  return {
    days,
    today: vilniusToday(),
    cars: (cars.data ?? []).map((c) => ({ id: c.id, title: c.title_lt, plate: c.plate, status: c.status })),
    items,
  };
}
