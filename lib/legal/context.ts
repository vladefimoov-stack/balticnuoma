import "server-only";
import type { Locale } from "next-intl";
import { analyticsEnabled } from "@/lib/consent";
import { getPublicSettings } from "@/lib/data/settings";
import type { RentalRules } from "@/lib/db/json";

/** Date of the current wording of the legal pages (shown as "Atnaujinta …"). Bump when texts change. */
export const LEGAL_UPDATED = "2026-11-26";

/** Everything the legal texts interpolate. Empty requisites become visible placeholders. */
export type LegalContext = {
  locale: Locale;
  company: { name: string; code: string; vat: string | null; address: string };
  office: string;
  /** false → the office is temporarily closed: handover at an agreed place (admin → Kontaktai). */
  officeOpen: boolean;
  phone: string;
  phoneE164: string;
  email: string;
  privacyEmail: string;
  rules: RentalRules;
  analytics: boolean;
};

const PLACEHOLDER = {
  lt: { code: "[įmonės kodas]", address: "[buveinės adresas]", email: "[el. paštas]" },
  en: { code: "[company code]", address: "[registered address]", email: "[email]" },
} as const;

export async function getLegalContext(locale: Locale): Promise<LegalContext> {
  const { company, contacts, rentalRules } = await getPublicSettings();
  const ph = PLACEHOLDER[locale];
  const email = contacts.email ?? company.privacyEmail ?? ph.email;
  return {
    locale,
    company: {
      name: company.legalName,
      code: company.companyCode ?? ph.code,
      vat: company.vatCode,
      address: company.registeredAddress ?? ph.address,
    },
    office: contacts.address,
    officeOpen: contacts.officeOpen,
    phone: contacts.phone,
    phoneE164: contacts.phoneE164,
    email,
    privacyEmail: company.privacyEmail ?? email,
    rules: rentalRules,
    analytics: analyticsEnabled,
  };
}
