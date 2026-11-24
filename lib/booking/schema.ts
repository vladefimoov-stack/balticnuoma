import { z } from "zod";
import { isIsoDate } from "@/lib/dates";

/**
 * Booking request contracts — shared by the widget (react-hook-form) and the server
 * action. Error messages are i18n keys under `booking.errors.*`.
 */

const isoDate = z.string().refine(isIsoDate, { error: "date" });

/** What is being booked: whole days (first..last day, inclusive) or hours on one day. */
export const selectionSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("days"), startDate: isoDate, endDate: isoDate }),
  z.object({
    mode: z.literal("hourly"),
    date: isoDate,
    startHour: z.number().int().min(0).max(23),
    hours: z.number().int().min(1).max(24),
  }),
]);
export type Selection = z.infer<typeof selectionSchema>;

const name = z.string().trim().min(1, { error: "required" }).max(80, { error: "tooLong" });

/** Accepts +370 600 00000, 8 600 00000, (0)…; 7–15 digits. */
export function isPlausiblePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return /^\+?[\d\s().-]+$/.test(value) && digits.length >= 7 && digits.length <= 15;
}

export const customerSchema = z.object({
  firstName: name,
  lastName: name,
  phone: z.string().trim().min(1, { error: "required" }).max(32, { error: "phone" }).refine(isPlausiblePhone, {
    error: "phone",
  }),
  email: z
    .string()
    .trim()
    .min(1, { error: "required" })
    .max(254, { error: "email" })
    .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, { error: "email" }),
  licenseYear: z
    .number({ error: "licenseYear" })
    .int({ error: "licenseYear" })
    .min(1940, { error: "licenseYear" })
    .refine((year) => year <= new Date().getFullYear(), { error: "licenseYear" }),
  /** "I am at least {age} and have driven for at least {years} years". */
  experienceConfirmed: z.boolean().refine(Boolean, { error: "confirm" }),
  comment: z.string().trim().max(1000, { error: "tooLong" }),
  consent: z.boolean().refine(Boolean, { error: "consent" }),
  /** Honeypot — hidden from people, bots fill it. */
  website: z.string().max(200).optional(),
});
export type CustomerInput = z.input<typeof customerSchema>;
export type Customer = z.output<typeof customerSchema>;
export type CustomerField = keyof Customer;

export const bookingRequestSchema = z.object({
  carId: z.uuid(),
  locale: z.enum(["lt", "en"]),
  selection: selectionSchema,
  customer: customerSchema,
  /** Epoch ms when the form was shown — submissions faster than a human are dropped. */
  startedAt: z.number().int().nonnegative(),
});
export type BookingRequest = z.input<typeof bookingRequestSchema>;

/** Normalizes a phone number: "8 612 34567" → "+37061234567", "00 49 …" → "+49…". */
export function normalizePhone(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) return `+${digits}`;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (digits.startsWith("370")) return `+${digits}`;
  if (digits.length === 9 && digits.startsWith("8")) return `+370${digits.slice(1)}`;
  return digits;
}

export type BookingErrorCode =
  | "invalid"
  | "rate_limited"
  | "period_unavailable"
  | "not_available"
  | "min_days"
  | "min_hours"
  | "too_long"
  | "past"
  | "too_far"
  | "hours_range"
  | "license"
  | "car_not_found"
  | "unavailable";

export type SubmitBookingResult =
  | { ok: true; number: string | null; emailed: boolean }
  | { ok: false; error: BookingErrorCode; min?: number; max?: number; fields?: Partial<Record<CustomerField, string>> };
