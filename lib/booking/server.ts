import "server-only";
import { createHmac } from "node:crypto";
import { DEFAULT_PRICING, DEFAULT_RENTAL_RULES } from "@/lib/data/defaults";
import {
  notificationsSchema,
  pricingSchema,
  rentalRulesSchema,
  resolveCarTerms,
  type Pricing,
  type RentalRules,
} from "@/lib/db/json";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import type { L10n } from "@/lib/data/cars";

type AdminClient = ReturnType<typeof createAdminClient>;

export type BookingCar = {
  id: string;
  slug: string;
  title: L10n;
  pricing: Pricing;
  rules: RentalRules;
  deposit: number;
};

/**
 * Authoritative (uncached) tariffs of a car for a booking — the widget's quote is only a
 * preview; the price stored on the booking is computed from this. The website books
 * published cars only; staff (`anyStatus`) may also book hidden / maintenance cars.
 */
export async function loadBookingCar(
  db: SupabaseClient<Database>,
  carId: string,
  opts: { anyStatus?: boolean } = {},
): Promise<BookingCar | null> {
  let carQuery = db
    .from("cars")
    .select(
      "id, slug, title_lt, title_en, price_overrides, rental_rules, deposit, category:categories!inner ( default_pricing, default_rental_rules )",
    )
    .eq("id", carId);
  carQuery = opts.anyStatus ? carQuery.neq("status", "draft") : carQuery.eq("status", "published");
  const [carResult, settingsResult] = await Promise.all([
    carQuery.maybeSingle(),
    db.from("settings").select("key, value").in("key", ["pricing", "rental_rules"]),
  ]);
  if (carResult.error) throw carResult.error;
  if (settingsResult.error) throw settingsResult.error;
  const car = carResult.data;
  if (!car) return null;

  const byKey = new Map(settingsResult.data.map((row) => [row.key, row.value]));
  const globalPricing = pricingSchema.safeParse(byKey.get("pricing"));
  const globalRules = rentalRulesSchema.safeParse(byKey.get("rental_rules"));

  const terms = resolveCarTerms({
    globalPricing: globalPricing.success ? globalPricing.data : DEFAULT_PRICING,
    globalRules: globalRules.success ? globalRules.data : DEFAULT_RENTAL_RULES,
    categoryPricing: car.category.default_pricing,
    categoryRules: car.category.default_rental_rules,
    carPricing: car.price_overrides,
    carRules: car.rental_rules,
    carDeposit: car.deposit,
  });

  return { id: car.id, slug: car.slug, title: { lt: car.title_lt, en: car.title_en }, ...terms };
}

/** Manager inbox for booking notifications: admin setting → env → nobody. */
export async function bookingNotifyEmail(db: AdminClient): Promise<string | null> {
  const { data } = await db.from("settings").select("value").eq("key", "notifications").maybeSingle();
  const parsed = notificationsSchema.safeParse(data?.value);
  return (parsed.success && parsed.data.booking_email) || process.env.BOOKING_NOTIFY_EMAIL?.trim() || null;
}

/** Salted, truncated hash of the client IP — the raw address is never stored. */
export function hashIp(ip: string) {
  const salt = process.env.IP_HASH_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "baltic-nuoma";
  return createHmac("sha256", salt).update(ip).digest("hex").slice(0, 32);
}

/** Client IP behind Vercel's proxy (x-forwarded-for is set by the platform). */
export function clientIp(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip")?.trim() || "unknown";
}

export function bookingRateLimit() {
  const value = Number.parseInt(process.env.BOOKING_RATE_LIMIT_PER_HOUR ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : 5;
}

/** true = allowed. Fails open (with a log) if the limiter itself errors, so bookings never break. */
export async function consumeRateLimit(db: AdminClient, key: string, max: number, windowSeconds: number) {
  const { data, error } = await db.rpc("consume_rate_limit", {
    p_key: key,
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("[booking] rate limit check failed:", error);
    return true;
  }
  return data === true;
}

/** Postgres range literal for a half-open interval. */
export function rangeLiteral(interval: { start: number; end: number }) {
  return `[${new Date(interval.start).toISOString()},${new Date(interval.end).toISOString()})`;
}

/** Is the period taken by a CONFIRMED booking or a manual block? (Requests never hold the car.) */
export async function isPeriodTaken(db: AdminClient, carId: string, range: string) {
  const { count, error } = await db
    .from("car_occupancy")
    .select("id", { count: "exact", head: true })
    .eq("car_id", carId)
    .overlaps("period", range);
  if (error) throw error;
  return (count ?? 0) > 0;
}

/** The same visitor re-sending the same request (double click, retry) gets the existing number. */
export async function findDuplicateRequest(db: AdminClient, carId: string, range: string, email: string) {
  const { data, error } = await db
    .from("bookings")
    .select("number")
    .eq("car_id", carId)
    .eq("status", "pending")
    .eq("customer_email", email)
    .eq("period", range)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.number ?? null;
}

/** Other pending requests for overlapping dates — shown to the manager in the notification. */
export async function countOverlappingRequests(db: AdminClient, carId: string, range: string, exceptId: string) {
  const { count, error } = await db
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("car_id", carId)
    .eq("status", "pending")
    .neq("id", exceptId)
    .overlaps("period", range);
  if (error) throw error;
  return count ?? 0;
}
