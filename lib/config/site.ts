/**
 * Static business facts used across the site (navbar, footer, JSON-LD, contacts).
 * Values that the owner edits at runtime (prices, hours, notify email) will live
 * in the Supabase `settings` table — these are the compile-time fallbacks.
 */
export const site = {
  name: "Baltic Nuoma",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").trim().replace(/\/+$/, ""),
  phone: {
    display: "+370 654 37549",
    e164: "+37065437549",
  },
  whatsappUrl: "https://wa.me/37065437549",
  /** Telegram username without `@`. Empty → the Telegram button is hidden. */
  telegramUsername: (process.env.NEXT_PUBLIC_TELEGRAM_USERNAME ?? "").replace(/^@/, ""),
  address: {
    street: "Birutės g. 21",
    city: "Klaipėda",
    postalCode: "", // TODO: owner to confirm postal code
    country: "LT",
    countryName: "Lietuva",
    /** Approximate — used only for JSON-LD / map pin, refine if needed. */
    geo: { lat: 55.7126, lng: 21.1347 },
  },
  /** Fallback opening hours (I–V 9:00–18:00). Editable later in admin settings. */
  openingHours: [{ days: ["Mo", "Tu", "We", "Th", "Fr"], opens: "09:00", closes: "18:00" }],
  timeZone: "Europe/Vilnius",
} as const;

export const telegramUrl = site.telegramUsername ? `https://t.me/${site.telegramUsername}` : null;

export const mapsQuery = encodeURIComponent(
  `${site.address.street}, ${site.address.city}, ${site.address.countryName}`,
);
export const mapsDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${mapsQuery}`;
