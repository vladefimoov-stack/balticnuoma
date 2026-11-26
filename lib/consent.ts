/**
 * Cookie consent (shared by client components and the cookie policy page).
 *
 * Categories: necessary cookies are always on; `maps` (Google Maps embed) and `analytics`
 * (Google Analytics 4, only when NEXT_PUBLIC_GA_MEASUREMENT_ID is set) wait for consent.
 * The choice lives in a first-party cookie for 12 months; bump CONSENT_VERSION when the
 * categories change so everyone is asked again.
 *
 * The cookie also records whether the analytics category was offered (`o`). Once GA is switched on,
 * a choice made while it wasn't offered no longer counts, so those visitors see the banner once more
 * (their old choice is not a "no" to analytics they never saw).
 */

export const CONSENT_COOKIE = "bn_consent";
export const CONSENT_VERSION = 1;
export const CONSENT_MAX_AGE_DAYS = 365;

export const GA_MEASUREMENT_ID = (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "").trim();
export const analyticsEnabled = /^G-[A-Z0-9]+$/.test(GA_MEASUREMENT_ID);

export type Consent = { maps: boolean; analytics: boolean; /** ms timestamp of the choice */ at: number };

export function parseConsent(raw: string | null | undefined, analyticsOn = analyticsEnabled): Consent | null {
  if (!raw) return null;
  try {
    const data: unknown = JSON.parse(decodeURIComponent(raw));
    if (!data || typeof data !== "object") return null;
    const { v, m, a, o, t } = data as Record<string, unknown>;
    if (v !== CONSENT_VERSION || typeof t !== "number") return null;
    // Chosen before analytics existed → ask again now that it does.
    if (analyticsOn && o !== 1) return null;
    return { maps: m === 1, analytics: a === 1 && analyticsOn, at: t };
  } catch {
    return null;
  }
}

export function serializeConsent(consent: Consent, analyticsOn = analyticsEnabled) {
  return encodeURIComponent(
    JSON.stringify({
      v: CONSENT_VERSION,
      m: consent.maps ? 1 : 0,
      a: consent.analytics ? 1 : 0,
      o: analyticsOn ? 1 : 0,
      t: consent.at,
    }),
  );
}
