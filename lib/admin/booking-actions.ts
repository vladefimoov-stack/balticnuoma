"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { bookingNumber } from "@/lib/booking/format";
import { sendBookingStatusEmail } from "@/lib/email/booking";
import { PERIOD_UNAVAILABLE_SQLSTATE } from "@/lib/supabase/types";
import { requireStaff, type Staff } from "./auth";
import { emailInputFromBooking } from "./booking-email";
import { getBooking } from "./bookings";

export type ActionResult = { ok: true; message: string } | { ok: false; error: string };

const id = z.uuid();
const reasonSchema = z.string().trim().min(3, "Nurodykite priežastį (bent 3 simboliai).").max(500);

const STALE = "Rezervacijos būsena jau pasikeitė. Atnaujinkite puslapį.";
const TAKEN =
  "Šios datos jau užimtos (patvirtinta rezervacija arba blokavimas). Atmeskite užklausą arba susitarkite su klientu dėl kitų datų.";

const emailsEnabled = () => Boolean(process.env.RESEND_API_KEY?.trim());

function refresh(bookingId: string) {
  revalidatePath("/admin", "layout");
  revalidatePath(`/admin/rezervacijos/${bookingId}`);
}

/**
 * Send the customer the confirmed / rejected email after the response (never blocks the action).
 * Returns a short LT note for the result message: sent / no email on file / email not configured.
 */
async function notifyCustomer(
  staff: Staff,
  bookingId: string,
  status: { status: "confirmed" } | { status: "rejected"; reason: string },
): Promise<string> {
  if (!emailsEnabled()) return " Laiškas nesiųstas — el. paštas dar nesukonfigūruotas.";
  const detail = await getBooking(staff.supabase, bookingId);
  const input = detail && emailInputFromBooking(detail.booking);
  if (!input) return " Kliento el. pašto nėra — praneškite jam telefonu.";
  after(async () => {
    try {
      await sendBookingStatusEmail(input, status);
    } catch (error) {
      console.error(`[admin] ${status.status} email for ${bookingNumber(input.number)} failed:`, error);
    }
  });
  return " Klientui siunčiamas laiškas.";
}

export async function confirmBooking(bookingId: string): Promise<ActionResult> {
  if (!id.safeParse(bookingId).success) return { ok: false, error: "Neteisingas ID." };
  const staff = await requireStaff();
  const { data, error } = await staff.supabase
    .from("bookings")
    .update({ status: "confirmed", rejection_reason: null })
    .eq("id", bookingId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (error) {
    if (error.code === PERIOD_UNAVAILABLE_SQLSTATE) return { ok: false, error: TAKEN };
    console.error("[admin] confirm failed:", error);
    return { ok: false, error: "Nepavyko patvirtinti. Bandykite dar kartą." };
  }
  if (!data) return { ok: false, error: STALE };
  const note = await notifyCustomer(staff, bookingId, { status: "confirmed" });
  refresh(bookingId);
  return { ok: true, message: `Rezervacija patvirtinta.${note}` };
}

export async function rejectBooking(bookingId: string, reason: string): Promise<ActionResult> {
  if (!id.safeParse(bookingId).success) return { ok: false, error: "Neteisingas ID." };
  const parsedReason = reasonSchema.safeParse(reason);
  if (!parsedReason.success) return { ok: false, error: parsedReason.error.issues[0].message };
  const staff = await requireStaff();
  const { data, error } = await staff.supabase
    .from("bookings")
    .update({ status: "rejected", rejection_reason: parsedReason.data })
    .eq("id", bookingId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("[admin] reject failed:", error);
    return { ok: false, error: "Nepavyko atmesti. Bandykite dar kartą." };
  }
  if (!data) return { ok: false, error: STALE };
  const note = await notifyCustomer(staff, bookingId, { status: "rejected", reason: parsedReason.data });
  refresh(bookingId);
  return { ok: true, message: `Užklausa atmesta.${note}` };
}

/** Cancel a confirmed booking (frees the dates). No automatic email — the manager tells the customer. */
export async function cancelBooking(bookingId: string, reason: string): Promise<ActionResult> {
  if (!id.safeParse(bookingId).success) return { ok: false, error: "Neteisingas ID." };
  const staff = await requireStaff();
  const note = reason.trim().slice(0, 500) || null;
  const { data, error } = await staff.supabase
    .from("bookings")
    .update({ status: "cancelled", rejection_reason: note })
    .eq("id", bookingId)
    .in("status", ["pending", "confirmed"])
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("[admin] cancel failed:", error);
    return { ok: false, error: "Nepavyko atšaukti. Bandykite dar kartą." };
  }
  if (!data) return { ok: false, error: STALE };
  refresh(bookingId);
  return { ok: true, message: "Rezervacija atšaukta, datos atlaisvintos. Praneškite klientui." };
}

/** Undo a rejection / cancellation: back to the request queue (no email). */
export async function reopenBooking(bookingId: string): Promise<ActionResult> {
  if (!id.safeParse(bookingId).success) return { ok: false, error: "Neteisingas ID." };
  const staff = await requireStaff();
  const { data, error } = await staff.supabase
    .from("bookings")
    .update({ status: "pending", rejection_reason: null })
    .eq("id", bookingId)
    .in("status", ["rejected", "cancelled"])
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("[admin] reopen failed:", error);
    return { ok: false, error: "Nepavyko grąžinti. Bandykite dar kartą." };
  }
  if (!data) return { ok: false, error: STALE };
  refresh(bookingId);
  return { ok: true, message: "Užklausa grąžinta į laukiančias." };
}

export async function saveManagerNote(bookingId: string, note: string): Promise<ActionResult> {
  if (!id.safeParse(bookingId).success) return { ok: false, error: "Neteisingas ID." };
  const staff = await requireStaff();
  const value = note.trim().slice(0, 2000) || null;
  const { error } = await staff.supabase.from("bookings").update({ manager_note: value }).eq("id", bookingId);
  if (error) {
    console.error("[admin] note failed:", error);
    return { ok: false, error: "Nepavyko išsaugoti pastabos." };
  }
  refresh(bookingId);
  return { ok: true, message: "Pastaba išsaugota." };
}

/** Standard reason in the customer's language (emails go out in the booking's locale). */
const OVERLAP_REJECTION_REASON = {
  lt: "Deja, pasirinktos datos jau užimtos.",
  en: "Unfortunately, the selected dates are already booked.",
};

/** After confirming: reject every other pending request for the same car and dates. */
export async function rejectOverlappingRequests(bookingId: string): Promise<ActionResult> {
  if (!id.safeParse(bookingId).success) return { ok: false, error: "Neteisingas ID." };
  const staff = await requireStaff();
  const detail = await getBooking(staff.supabase, bookingId);
  if (!detail || detail.booking.status !== "confirmed") return { ok: false, error: STALE };

  let rejected = 0;
  let emailed = 0;
  for (const request of detail.otherRequests) {
    const reason = OVERLAP_REJECTION_REASON[request.locale === "en" ? "en" : "lt"];
    const { data } = await staff.supabase
      .from("bookings")
      .update({ status: "rejected", rejection_reason: reason })
      .eq("id", request.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (data) {
      rejected++;
      const note = await notifyCustomer(staff, request.id, { status: "rejected", reason });
      if (note.includes("siunčiamas")) emailed++;
      revalidatePath(`/admin/rezervacijos/${request.id}`);
    }
  }
  refresh(bookingId);
  const noEmail = rejected - emailed;
  return {
    ok: true,
    message: `Atmesta užklausų: ${rejected}.${emailed ? ` Laiškų siunčiama: ${emailed}.` : ""}${noEmail ? ` Be el. pašto: ${noEmail} — praneškite telefonu.` : ""}`,
  };
}
