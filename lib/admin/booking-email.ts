import "server-only";
import { z } from "zod";
import { selectionSchema, type Selection } from "@/lib/booking/schema";
import { RENTAL_TYPES } from "@/lib/db/json";
import type { Range } from "@/lib/db/range";
import type { BookingEmailInput } from "@/lib/email/booking";
import type { Quote } from "@/lib/pricing/calculate";
import type { RentalType } from "@/lib/supabase/types";
import { dayBoundsOf, isWholeDays, vilniusDate } from "./format";
import { TZDate } from "@date-fns/tz";
import { TIME_ZONE } from "@/lib/dates";

const quoteSchema = z.object({
  rentalType: z.enum(RENTAL_TYPES),
  total: z.number(),
  lines: z.array(
    z.object({
      kind: z.enum(["hours", "days", "weeks", "longTermWeeks", "longTermDays", "extraWeek"]),
      quantity: z.number(),
      unitPrice: z.number(),
      total: z.number(),
    }),
  ),
  days: z.number().optional(),
  hours: z.number().optional(),
});

/** bookings.price_breakdown written by the website (version 1). */
const breakdownSchema = z.object({ version: z.literal(1), selection: selectionSchema, quote: quoteSchema });

/** Selection for bookings without a breakdown (e.g. entered by staff): derived from the period. */
function selectionFromRange(range: Range): Selection {
  if (isWholeDays(range)) {
    const { first, last } = dayBoundsOf(range);
    return { mode: "days", startDate: first, endDate: last };
  }
  const start = new TZDate(range.start.getTime(), TIME_ZONE);
  return {
    mode: "hourly",
    date: vilniusDate(range.start),
    startHour: start.getHours(),
    hours: Math.max(1, Math.round((range.end.getTime() - range.start.getTime()) / 3_600_000)),
  };
}

type Row = {
  id: string;
  number: number;
  locale: string;
  range: Range;
  rental_type: RentalType;
  total_price: number;
  deposit: number;
  price_breakdown: unknown;
  customer_first_name: string;
  customer_last_name: string;
  customer_phone: string;
  customer_email: string;
  license_year: number;
  comment: string | null;
  car: { slug: string; title_lt: string; title_en: string | null } | null;
};

export function emailInputFromBooking(row: Row): BookingEmailInput | null {
  if (!row.car) return null;
  const parsed = breakdownSchema.safeParse(row.price_breakdown);
  const selection = parsed.success ? parsed.data.selection : selectionFromRange(row.range);
  const quote: Quote = parsed.success
    ? parsed.data.quote
    : {
        rentalType: row.rental_type,
        total: Number(row.total_price),
        lines: [],
        ...(selection.mode === "days" ? { days: dayBoundsOf(row.range).days } : { hours: selection.hours }),
      };
  return {
    id: row.id,
    number: row.number,
    locale: row.locale === "en" ? "en" : "lt",
    car: { slug: row.car.slug, title: { lt: row.car.title_lt, en: row.car.title_en } },
    selection,
    quote,
    deposit: Number(row.deposit),
    customer: {
      firstName: row.customer_first_name,
      lastName: row.customer_last_name,
      phone: row.customer_phone,
      email: row.customer_email,
      licenseYear: row.license_year,
      comment: row.comment,
    },
  };
}
