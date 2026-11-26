import type { Pricing, RentalRules } from "@/lib/db/json";
import { site } from "@/lib/config/site";

/**
 * Fallback values used when Supabase is not configured or unreachable, so the
 * public site always renders. They mirror supabase/seed.sql.
 */
export const DEFAULT_PRICING: Pricing = {
  currency: "EUR",
  hourly: { enabled: true, price: 6, min_hours: 3 },
  daily: { enabled: true, price: 18 },
  weekly: { enabled: true, price: 115 },
  long_term: { enabled: true, price_per_week: 105, min_weeks: 4 },
  deposit: 500,
};

export const DEFAULT_RENTAL_RULES: RentalRules = {
  min_age: 21,
  min_license_years: 2,
  min_rental_days: null,
  mileage_limit_km_per_day: null,
};

export type Contacts = {
  phone: string;
  phoneE164: string;
  telegramUrl: string | null;
  email: string | null;
  address: string;
  /** false → the site shows "office temporarily closed" instead of the address (admin → Kontaktai). */
  officeOpen: boolean;
};

export const DEFAULT_CONTACTS: Contacts = {
  phone: site.phone.display,
  phoneE164: site.phone.e164,
  telegramUrl: site.telegramUsername ? `https://t.me/${site.telegramUsername}` : null,
  email: null,
  address: `${site.address.street}, ${site.address.city}`,
  officeOpen: false,
};

export type OpeningHours = Array<{ days: number[]; opens: string; closes: string }>;

export const DEFAULT_OPENING_HOURS: OpeningHours = [{ days: [1, 2, 3, 4, 5], opens: "09:00", closes: "18:00" }];
