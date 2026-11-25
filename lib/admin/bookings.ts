import "server-only";
import { z } from "zod";
import { addDaysIso, isIsoDate, vilniusDayStart } from "@/lib/dates";
import { parseRange, rangeLiteral, type Range } from "@/lib/db/range";
import type { BookingStatus, RentalType } from "@/lib/supabase/types";
import type { Staff } from "./auth";

type Db = Staff["supabase"];

export const BOOKING_STATUSES = ["pending", "confirmed", "rejected", "cancelled"] as const;
export const PAGE_SIZE = 40;

/* ── Filters (from the URL) ─────────────────────────────────────────────────── */

export const bookingFiltersSchema = z.object({
  status: z.enum(["all", ...BOOKING_STATUSES]).catch("all"),
  car: z.uuid().optional().catch(undefined),
  from: z.string().refine(isIsoDate).optional().catch(undefined),
  to: z.string().refine(isIsoDate).optional().catch(undefined),
  q: z.string().trim().max(80).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(1000).catch(1),
});
export type BookingFilters = z.infer<typeof bookingFiltersSchema>;

export function parseBookingFilters(params: Record<string, string | string[] | undefined>): BookingFilters {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
  return bookingFiltersSchema.parse({
    status: first(params.status) ?? "all",
    car: first(params.car),
    from: first(params.from),
    to: first(params.to),
    q: first(params.q),
    page: first(params.page) ?? 1,
  });
}

export function filtersToQuery(filters: Partial<BookingFilters>) {
  const p = new URLSearchParams();
  if (filters.status && filters.status !== "all") p.set("status", filters.status);
  if (filters.car) p.set("car", filters.car);
  if (filters.from) p.set("from", filters.from);
  if (filters.to) p.set("to", filters.to);
  if (filters.q) p.set("q", filters.q);
  if (filters.page && filters.page > 1) p.set("page", String(filters.page));
  return p.toString();
}

/* ── Rows ───────────────────────────────────────────────────────────────────── */

const LIST_SELECT = `
  id, number, status, period, rental_type, customer_first_name, customer_last_name, customer_phone,
  customer_email, license_year, comment, manager_note, locale, total_price, deposit, created_at,
  car:cars!bookings_car_id_fkey ( id, slug, title_lt, plate )
`;

type RawListRow = {
  id: string;
  number: number;
  status: BookingStatus;
  period: unknown;
  rental_type: RentalType;
  customer_first_name: string;
  customer_last_name: string;
  customer_phone: string;
  customer_email: string;
  license_year: number;
  comment: string | null;
  manager_note: string | null;
  locale: string;
  total_price: number;
  deposit: number;
  created_at: string;
  car: { id: string; slug: string; title_lt: string; plate: string | null } | null;
};

export type BookingListRow = Omit<RawListRow, "period"> & {
  range: Range;
  /** Pending requests only: dates already taken by a confirmed booking / block. */
  taken: boolean;
  /** Pending requests only: other pending requests for overlapping dates. */
  otherRequests: number;
};

/** Escape a search term for a PostgREST `or=(…ilike…)` filter. */
function searchTerm(q: string) {
  return q.replace(/[%_,()*\\"]/g, " ").trim();
}

function applyFilters<T extends { eq: (c: string, v: string) => T }>(query: T, filters: BookingFilters): T {
  let q = query;
  if (filters.status !== "all") q = q.eq("status", filters.status);
  if (filters.car) q = q.eq("car_id", filters.car);
  return q;
}

/** Bookings matching the filters, newest first, with conflict hints for pending requests. */
export async function listBookings(db: Db, filters: BookingFilters, opts: { all?: boolean } = {}) {
  let query = applyFilters(db.from("bookings").select(LIST_SELECT, { count: "exact" }), filters);

  if (filters.from || filters.to) {
    const from = filters.from ?? "2000-01-01";
    const to = filters.to ?? "2100-01-01";
    query = query.overlaps("period", rangeLiteral(vilniusDayStart(from), vilniusDayStart(addDaysIso(to, 1))));
  }
  if (filters.q) {
    const term = filters.q.replace(/^BN-?/i, "");
    if (/^\d+$/.test(term)) {
      query = query.eq("number", Number(term));
    } else {
      const s = searchTerm(filters.q);
      if (s) {
        query = query.or(
          ["customer_first_name", "customer_last_name", "customer_phone", "customer_email"]
            .map((column) => `${column}.ilike.*${s}*`)
            .join(","),
        );
      }
    }
  }

  query = query.order("created_at", { ascending: false });
  query = opts.all ? query.limit(5000) : query.range((filters.page - 1) * PAGE_SIZE, filters.page * PAGE_SIZE - 1);

  const { data, error, count } = await query.returns<RawListRow[]>();
  if (error) throw error;

  const rows = data.map((row) => ({ ...row, range: parseRange(row.period) }));
  const hints = await conflictHints(db, rows);
  return {
    rows: rows.map(({ period: _period, ...row }) => ({
      ...row,
      taken: hints.taken.has(row.id),
      otherRequests: hints.others.get(row.id) ?? 0,
    })) as BookingListRow[],
    total: count ?? rows.length,
  };
}

/** For pending rows: is the period taken (occupancy) and how many other requests overlap it. */
async function conflictHints(
  db: Db,
  rows: Array<{ id: string; status: BookingStatus; range: Range; car: { id: string } | null }>,
) {
  const pending = rows.filter((r) => r.status === "pending" && r.car);
  const taken = new Set<string>();
  const others = new Map<string, number>();
  if (pending.length === 0) return { taken, others };

  const carIds = [...new Set(pending.map((r) => r.car!.id))];
  const window = rangeLiteral(
    Math.min(...pending.map((r) => r.range.start.getTime())),
    Math.max(...pending.map((r) => r.range.end.getTime())),
  );
  const [occupancy, requests] = await Promise.all([
    db.from("car_occupancy").select("car_id, period").in("car_id", carIds).overlaps("period", window),
    db
      .from("bookings")
      .select("id, car_id, period")
      .eq("status", "pending")
      .in("car_id", carIds)
      .overlaps("period", window),
  ]);
  if (occupancy.error) throw occupancy.error;
  if (requests.error) throw requests.error;

  const occ = occupancy.data.map((o) => ({ car: o.car_id, ...parseRange(o.period) }));
  const req = requests.data.map((b) => ({ id: b.id, car: b.car_id, ...parseRange(b.period) }));
  const overlaps = (a: Range, b: Range) => a.start < b.end && b.start < a.end;

  for (const row of pending) {
    if (occ.some((o) => o.car === row.car!.id && overlaps(o, row.range))) taken.add(row.id);
    const n = req.filter((b) => b.id !== row.id && b.car === row.car!.id && overlaps(b, row.range)).length;
    if (n > 0) others.set(row.id, n);
  }
  return { taken, others };
}

/* ── One booking ───────────────────────────────────────────────────────────── */

export async function getBooking(db: Db, id: string) {
  const { data, error } = await db
    .from("bookings")
    .select(
      `*, car:cars!bookings_car_id_fkey ( id, slug, title_lt, title_en, plate, status ),
       changer:profiles!bookings_status_changed_by_fkey ( full_name )`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const range = parseRange(data.period);

  // What else is on these dates for the same car?
  const literal = rangeLiteral(range.start, range.end);
  const [occupancy, requests] = await Promise.all([
    db
      .from("car_occupancy")
      .select(
        "booking_id, block_id, period, booking:bookings ( id, number, customer_first_name, customer_last_name ), block:blocks ( id, reason )",
      )
      .eq("car_id", data.car_id)
      .overlaps("period", literal),
    db
      .from("bookings")
      .select("id, number, period, locale, customer_first_name, customer_last_name, created_at")
      .eq("car_id", data.car_id)
      .eq("status", "pending")
      .neq("id", id)
      .overlaps("period", literal)
      .order("created_at"),
  ]);
  if (occupancy.error) throw occupancy.error;
  if (requests.error) throw requests.error;

  return {
    booking: { ...data, range },
    occupiedBy: occupancy.data.filter((o) => o.booking_id !== id).map((o) => ({ ...o, range: parseRange(o.period) })),
    otherRequests: requests.data.map((r) => ({ ...r, range: parseRange(r.period) })),
  };
}

export type BookingDetail = NonNullable<Awaited<ReturnType<typeof getBooking>>>;
