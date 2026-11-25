"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { sendBookingRequestEmails } from "@/lib/email/booking";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { PERIOD_UNAVAILABLE_SQLSTATE } from "@/lib/supabase/types";
import { bookingNumber } from "./format";
import { bookingRequestSchema, normalizePhone, type CustomerField, type SubmitBookingResult } from "./schema";
import { checkSelectionTiming, quoteSelection, selectionInterval } from "./selection";
import {
  bookingNotifyEmail,
  bookingRateLimit,
  clientIp,
  consumeRateLimit,
  countOverlappingRequests,
  findDuplicateRequest,
  hashIp,
  isPeriodTaken,
  loadBookingCar,
  rangeLiteral,
} from "./server";

/** A person needs longer than this to pick dates and fill the form. */
const MIN_FILL_MS = 3_000;

/**
 * Public booking request. Everything the browser sends is re-validated here:
 * schema → bot checks → dates → rate limit → authoritative price → dates not taken by a
 * confirmed booking / block → insert as a `pending` request → emails after the response.
 */
export async function submitBooking(raw: unknown): Promise<SubmitBookingResult> {
  const parsed = bookingRequestSchema.safeParse(raw);
  if (!parsed.success) {
    const fields: Partial<Record<CustomerField, string>> = {};
    for (const issue of parsed.error.issues) {
      const [scope, field] = issue.path;
      if (scope === "customer" && typeof field === "string") fields[field as CustomerField] ??= issue.message;
    }
    return { ok: false, error: "invalid", fields };
  }
  const { carId, locale, selection, customer, startedAt } = parsed.data;

  // Bots: a filled honeypot or an inhumanly fast submit gets a fake success and nothing is stored.
  if (customer.website || Date.now() - startedAt < MIN_FILL_MS) {
    console.info("[booking] dropped a bot submission");
    return { ok: true, number: null, emailed: false };
  }

  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[booking] Supabase service role is not configured");
    return { ok: false, error: "unavailable" };
  }

  const timing = checkSelectionTiming(selection);
  if (timing) return { ok: false, error: timing };

  const db = createAdminClient();
  const ipHash = hashIp(clientIp(await headers()));
  if (!(await consumeRateLimit(db, `booking:${ipHash}`, bookingRateLimit(), 3600))) {
    return { ok: false, error: "rate_limited" };
  }

  let car;
  try {
    car = await loadBookingCar(db, carId);
  } catch (error) {
    console.error("[booking] loading the car failed:", error);
    return { ok: false, error: "unavailable" };
  }
  if (!car) return { ok: false, error: "car_not_found" };

  const quote = quoteSelection(car.pricing, car.rules, selection);
  if (!quote.ok) return { ok: false, error: quote.reason, min: quote.min, max: quote.max };

  const experience = new Date().getFullYear() - customer.licenseYear;
  if (experience < car.rules.min_license_years) {
    return { ok: false, error: "license", min: car.rules.min_license_years };
  }

  const range = rangeLiteral(selectionInterval(selection));
  const customerRow = {
    firstName: customer.firstName,
    lastName: customer.lastName,
    phone: normalizePhone(customer.phone),
    email: customer.email.toLowerCase(),
    licenseYear: customer.licenseYear,
    comment: customer.comment || null,
  };

  const emailed = Boolean(process.env.RESEND_API_KEY?.trim());

  // A request does not hold the car: only confirmed bookings and manual blocks make dates
  // unavailable. Several visitors may ask for the same dates; the manager confirms one.
  try {
    if (await isPeriodTaken(db, car.id, range)) return { ok: false, error: "period_unavailable" };
    const duplicate = await findDuplicateRequest(db, car.id, range, customerRow.email);
    if (duplicate !== null) return { ok: true, number: bookingNumber(duplicate), emailed };
  } catch (error) {
    console.error("[booking] availability check failed:", error);
    return { ok: false, error: "unavailable" };
  }

  const { data: booking, error } = await db
    .from("bookings")
    .insert({
      car_id: car.id,
      period: range,
      rental_type: quote.quote.rentalType,
      status: "pending",
      customer_first_name: customerRow.firstName,
      customer_last_name: customerRow.lastName,
      customer_phone: customerRow.phone,
      customer_email: customerRow.email,
      license_year: customerRow.licenseYear,
      experience_confirmed: true,
      comment: customerRow.comment,
      locale,
      total_price: quote.quote.total,
      deposit: car.deposit,
      price_breakdown: { version: 1, currency: "EUR", selection, quote: quote.quote },
      terms_accepted_at: new Date().toISOString(),
      ip_hash: ipHash,
    })
    .select("id, number")
    .single();

  if (error) {
    if (error.code === PERIOD_UNAVAILABLE_SQLSTATE) return { ok: false, error: "period_unavailable" };
    console.error("[booking] insert failed:", error);
    return { ok: false, error: "unavailable" };
  }

  // Emails never block or fail the booking — they run after the response is sent.
  after(async () => {
    try {
      await sendBookingRequestEmails(
        {
          id: booking.id,
          number: booking.number,
          locale,
          car: { slug: car.slug, title: car.title },
          selection,
          quote: quote.quote,
          deposit: car.deposit,
          customer: customerRow,
          otherRequests: await countOverlappingRequests(db, car.id, range, booking.id).catch(() => 0),
        },
        await bookingNotifyEmail(db),
      );
    } catch (emailError) {
      console.error(`[booking] emails for ${bookingNumber(booking.number)} failed:`, emailError);
    }
  });

  return { ok: true, number: bookingNumber(booking.number), emailed };
}
