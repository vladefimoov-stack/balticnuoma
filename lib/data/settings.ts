import "server-only";
import { unstable_cache } from "next/cache";
import {
  contactsSchema,
  openingHoursSchema,
  pricingSchema,
  rentalRulesSchema,
  type Pricing,
  type RentalRules,
} from "@/lib/db/json";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";
import { CACHE_TAGS, PUBLIC_REVALIDATE_SECONDS } from "./cache";
import {
  DEFAULT_CONTACTS,
  DEFAULT_OPENING_HOURS,
  DEFAULT_PRICING,
  DEFAULT_RENTAL_RULES,
  type Contacts,
  type OpeningHours,
} from "./defaults";

export type PublicSettings = {
  pricing: Pricing;
  rentalRules: RentalRules;
  contacts: Contacts;
  openingHours: OpeningHours;
};

const FALLBACK: PublicSettings = {
  pricing: DEFAULT_PRICING,
  rentalRules: DEFAULT_RENTAL_RULES,
  contacts: DEFAULT_CONTACTS,
  openingHours: DEFAULT_OPENING_HOURS,
};

function toE164(phone: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  return digits.startsWith("+") ? digits : `+${digits}`;
}

async function fetchPublicSettings(): Promise<PublicSettings> {
  if (!isSupabaseConfigured) return FALLBACK;
  try {
    const { data, error } = await createPublicClient()
      .from("settings")
      .select("key, value")
      .in("key", ["pricing", "rental_rules", "contacts", "opening_hours"]);
    if (error) throw error;

    const byKey = new Map(data.map((row) => [row.key, row.value]));
    const pricing = pricingSchema.safeParse(byKey.get("pricing"));
    const rules = rentalRulesSchema.safeParse(byKey.get("rental_rules"));
    const contacts = contactsSchema.safeParse(byKey.get("contacts"));
    const hours = openingHoursSchema.safeParse(byKey.get("opening_hours"));

    const c = contacts.success ? contacts.data : null;
    const telegram = c?.telegram_username?.replace(/^@/, "") ?? "";

    return {
      pricing: pricing.success ? pricing.data : DEFAULT_PRICING,
      rentalRules: rules.success ? rules.data : DEFAULT_RENTAL_RULES,
      openingHours: hours.success && hours.data.length > 0 ? hours.data : DEFAULT_OPENING_HOURS,
      contacts: c
        ? {
            phone: c.phone || DEFAULT_CONTACTS.phone,
            phoneE164: c.phone ? toE164(c.phone) : DEFAULT_CONTACTS.phoneE164,
            whatsappUrl: c.whatsapp_url || DEFAULT_CONTACTS.whatsappUrl,
            // Telegram set in admin wins; otherwise the env fallback.
            telegramUrl: telegram ? `https://t.me/${telegram}` : DEFAULT_CONTACTS.telegramUrl,
            email: c.email || null,
            address: c.address || DEFAULT_CONTACTS.address,
          }
        : DEFAULT_CONTACTS,
    };
  } catch (error) {
    console.error("[settings] falling back to defaults:", error);
    return FALLBACK;
  }
}

/** Public settings (tariffs, rules, contacts, hours) — cached, revalidated by tag `settings`. */
export const getPublicSettings = unstable_cache(fetchPublicSettings, ["public-settings"], {
  tags: [CACHE_TAGS.settings],
  revalidate: PUBLIC_REVALIDATE_SECONDS,
});
