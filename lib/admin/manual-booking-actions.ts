"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { bookingNumber } from "@/lib/booking/format";
import { selectionSchema, normalizePhone, type Selection } from "@/lib/booking/schema";
import { quoteSelection, selectionDays, selectionInterval } from "@/lib/booking/selection";
import { loadBookingCar } from "@/lib/booking/server";
import { addDaysIso, vilniusToday } from "@/lib/dates";
import { parseRange, rangeLiteral } from "@/lib/db/range";
import { sendBookingStatusEmail } from "@/lib/email/booking";
import type { Quote, QuoteResult } from "@/lib/pricing/calculate";
import { PERIOD_UNAVAILABLE_SQLSTATE } from "@/lib/supabase/types";
import { requireStaff, type Staff } from "./auth";
import type { ActionResult } from "./booking-actions";
import { emailInputFromBooking } from "./booking-email";
import { getBooking } from "./bookings";
import { formatRange } from "./format";
import { manualBookingSchema, type ManualBookingInput } from "./manual-booking-schema";

type Db = Staff["supabase"];

/** Staff may enter past bookings (already picked up) and up to two years ahead. */
function checkStaffSelection(selection: Selection): string | null {
  const today = vilniusToday();
  const min = addDaysIso(today, -365);
  const max = addDaysIso(today, 730);
  if (selection.mode === "days") {
    if (selection.endDate < selection.startDate) return "Pabaiga negali būti ankstesnė už pradžią.";
    if (selection.startDate < min || selection.endDate > max)
      return "Datos turi būti ne senesnės kaip metai ir ne vėlesnės kaip po 2 metų.";
    return null;
  }
  if (selection.startHour + selection.hours > 24) return "Valandinė nuoma turi baigtis iki 24:00.";
  if (selection.date < min || selection.date > max)
    return "Data turi būti ne senesnė kaip metai ir ne vėlesnė kaip po 2 metų.";
  return null;
}

export type Conflict = { kind: "confirmed" | "block" | "request"; label: string; period: string; href: string | null };

/** What else is on these dates for the car (confirmed bookings and blocks make the dates unavailable). */
async function findConflicts(db: Db, carId: string, literal: string): Promise<Conflict[]> {
  const [occupancy, requests] = await Promise.all([
    db
      .from("car_occupancy")
      .select(
        "period, booking:bookings ( id, number, customer_first_name, customer_last_name ), block:blocks ( reason )",
      )
      .eq("car_id", carId)
      .overlaps("period", literal),
    db
      .from("bookings")
      .select("id, number, period, customer_first_name, customer_last_name")
      .eq("car_id", carId)
      .eq("status", "pending")
      .overlaps("period", literal),
  ]);
  if (occupancy.error) throw occupancy.error;
  if (requests.error) throw requests.error;
  return [
    ...occupancy.data.map((o): Conflict => {
      const period = formatRange(parseRange(o.period));
      return o.booking
        ? {
            kind: "confirmed",
            label: `${bookingNumber(o.booking.number)} · ${o.booking.customer_first_name} ${o.booking.customer_last_name}`,
            period,
            href: `/admin/rezervacijos/${o.booking.id}`,
          }
        : { kind: "block", label: o.block?.reason || "Blokuota", period, href: "/admin/kalendorius" };
    }),
    ...requests.data.map((r): Conflict => ({
      kind: "request",
      label: `${bookingNumber(r.number)} · ${r.customer_first_name} ${r.customer_last_name}`,
      period: formatRange(parseRange(r.period)),
      href: `/admin/rezervacijos/${r.id}`,
    })),
  ];
}

export type ManualPreview =
  { ok: true; quote: QuoteResult; deposit: number; conflicts: Conflict[] } | { ok: false; error: string };

/** Live price + availability for the form (no writes). */
export async function previewManualBooking(input: { carId: string; selection: Selection }): Promise<ManualPreview> {
  const parsed = z.object({ carId: z.uuid(), selection: selectionSchema }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Pasirinkite automobilį ir datas." };
  const problem = checkStaffSelection(parsed.data.selection);
  if (problem) return { ok: false, error: problem };
  const staff = await requireStaff();
  const car = await loadBookingCar(staff.supabase, parsed.data.carId, { anyStatus: true });
  if (!car) return { ok: false, error: "Automobilis nerastas." };
  const interval = selectionInterval(parsed.data.selection);
  return {
    ok: true,
    quote: quoteSelection(car.pricing, car.rules, parsed.data.selection),
    deposit: car.deposit,
    conflicts: await findConflicts(staff.supabase, car.id, rangeLiteral(interval.start, interval.end)),
  };
}

const QUOTE_PROBLEM: Record<string, string> = {
  not_available: "šiam automobiliui toks nuomos būdas netaikomas",
  min_days: "trumpesnė nei mažiausias nuomos laikotarpis",
  min_hours: "mažiau valandų nei leidžiama",
  too_long: "per ilgas laikotarpis",
};

/** Create the booking (usually already confirmed) and open its card. */
export async function createManualBooking(input: ManualBookingInput): Promise<ActionResult> {
  const parsed = manualBookingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const f = parsed.data;
  const problem = checkStaffSelection(f.selection);
  if (problem) return { ok: false, error: problem };

  const staff = await requireStaff();
  const car = await loadBookingCar(staff.supabase, f.carId, { anyStatus: true });
  if (!car) return { ok: false, error: "Automobilis nerastas." };

  const quote = quoteSelection(car.pricing, car.rules, f.selection);
  const total = f.total ?? (quote.ok ? quote.quote.total : null);
  if (total === null) {
    const reason = quote.ok ? "" : (QUOTE_PROBLEM[quote.reason] ?? quote.reason);
    return {
      ok: false,
      error: `Kainos pagal tarifus apskaičiuoti nepavyko (${reason}) — įveskite kainą rankiniu būdu.`,
    };
  }
  const manualPrice = !quote.ok || total !== quote.quote.total;
  const stored: Quote =
    quote.ok && !manualPrice
      ? quote.quote
      : {
          rentalType: quote.ok ? quote.quote.rentalType : f.selection.mode === "hourly" ? "hourly" : "daily",
          total,
          lines: [],
          ...(f.selection.mode === "days" ? { days: selectionDays(f.selection) } : { hours: f.selection.hours }),
        };

  const interval = selectionInterval(f.selection);
  const now = new Date().toISOString();
  const { data, error } = await staff.supabase
    .from("bookings")
    .insert({
      car_id: car.id,
      period: rangeLiteral(interval.start, interval.end),
      rental_type: stored.rentalType,
      status: f.status,
      source: "admin",
      customer_first_name: f.firstName,
      customer_last_name: f.lastName,
      customer_phone: normalizePhone(f.phone),
      customer_email: f.email ? f.email.toLowerCase() : null,
      license_year: f.licenseYear,
      experience_confirmed: false,
      comment: f.comment || null,
      manager_note: f.managerNote || null,
      locale: f.locale,
      total_price: total,
      deposit: f.deposit ?? car.deposit,
      price_breakdown: { version: 1, currency: "EUR", selection: f.selection, quote: stored, manualPrice },
      terms_accepted_at: null,
      ...(f.status === "confirmed" ? { status_changed_at: now, status_changed_by: staff.user.id } : {}),
    })
    .select("id, number")
    .single();

  if (error) {
    if (error.code === PERIOD_UNAVAILABLE_SQLSTATE) {
      return {
        ok: false,
        error:
          "Šios datos jau užimtos (patvirtinta rezervacija arba blokavimas). Pasirinkite kitas datas arba išsaugokite kaip laukiančią.",
      };
    }
    if (error.code === "PGRST204" || error.code === "42703") {
      return {
        ok: false,
        error:
          "Duomenų bazėje trūksta naujos migracijos 20261125140000_admin_bookings.sql — paleiskite ją (docs/SUPABASE_SETUP.md).",
      };
    }
    console.error("[admin] manual booking failed:", error);
    return { ok: false, error: "Nepavyko išsaugoti rezervacijos. Patikrinkite duomenis." };
  }

  let emailed = false;
  if (f.status === "confirmed" && f.sendEmail && f.email && process.env.RESEND_API_KEY?.trim()) {
    const detail = await getBooking(staff.supabase, data.id);
    const emailInput = detail && emailInputFromBooking(detail.booking);
    if (emailInput) {
      emailed = true;
      after(async () => {
        try {
          await sendBookingStatusEmail(emailInput, { status: "confirmed" });
        } catch (sendError) {
          console.error(`[admin] confirmation for ${bookingNumber(data.number)} failed:`, sendError);
        }
      });
    }
  }

  revalidatePath("/admin", "layout");
  redirect(`/admin/rezervacijos/${data.id}?sukurta=1${emailed ? "&laiskas=1" : ""}`);
}
