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
import type { createAdminClient } from "@/lib/supabase/admin";
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
 * Authoritative (uncached) tariffs of a published car for a booking — the widget's
 * quote is only a preview; the price stored on the booking is computed from this.
 */
export async function loadBookingCar(db: AdminClient, carId: string): Promise<BookingCar | null> {
  const [carResult, settingsResult] = await Promise.all([
    db
      .from("cars")
      .select(
        "id, slug, title_lt, title_en, price_overrides, rental_rules, deposit, category:categories!inner ( default_pricing, default_rental_rules )",
      )
      .eq("id", carId)
      .eq("status", "published")
      .maybeSingle(),
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
