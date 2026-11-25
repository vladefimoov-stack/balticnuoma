import { NextResponse, type NextRequest } from "next/server";
import { BOOKING_STATUS_LABEL } from "@/components/admin/ui";
import { getStaff } from "@/lib/admin/auth";
import { listBookings, parseBookingFilters } from "@/lib/admin/bookings";
import { dayBoundsOf, formatDateTime, isWholeDays, RENTAL_TYPE_LABEL } from "@/lib/admin/format";
import { bookingNumber } from "@/lib/booking/format";
import { vilniusToday } from "@/lib/dates";

/**
 * GET /admin/rezervacijos/csv?<same filters as the list> — bookings as CSV for Excel
 * (UTF-8 with BOM, ";" separator as Lithuanian Excel expects, decimal comma).
 */
export async function GET(request: NextRequest) {
  const staff = await getStaff();
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const filters = parseBookingFilters(Object.fromEntries(request.nextUrl.searchParams));
  const { rows } = await listBookings(staff.supabase, filters, { all: true });

  const cell = (value: unknown) => {
    const text = value === null || value === undefined ? "" : String(value);
    // Quote everything; neutralize spreadsheet formulas in user-provided text.
    const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const money = (n: number) => String(Number(n).toFixed(2)).replace(".", ",");
  // Excel would turn "+37060000000" into a number; ="…" keeps it as text (digits only, so it is safe).
  const phone = (value: string) => (/^\+?\d{5,20}$/.test(value) ? `"=""${value}"""` : cell(value));

  const header = [
    "Nr.",
    "Būsena",
    "Automobilis",
    "Valst. nr.",
    "Nuo",
    "Iki",
    "Trukmė",
    "Tarifas",
    "Vardas",
    "Pavardė",
    "Telefonas",
    "El. paštas",
    "Pažymėjimas nuo",
    "Suma, EUR",
    "Užstatas, EUR",
    "Kliento komentaras",
    "Vadybininko pastaba",
    "Kalba",
    "Gauta",
  ];

  const lines = rows.map((r) => {
    const whole = isWholeDays(r.range);
    const bounds = whole ? dayBoundsOf(r.range) : null;
    return [
      bookingNumber(r.number),
      BOOKING_STATUS_LABEL[r.status],
      r.car?.title_lt ?? "",
      r.car?.plate ?? "",
      bounds ? bounds.first : formatDateTime(r.range.start),
      bounds ? bounds.last : formatDateTime(r.range.end),
      bounds
        ? `${bounds.days} d.`
        : `${Math.round((r.range.end.getTime() - r.range.start.getTime()) / 3_600_000)} val.`,
      RENTAL_TYPE_LABEL[r.rental_type],
      r.customer_first_name,
      r.customer_last_name,
      { raw: phone(r.customer_phone) },
      r.customer_email ?? "",
      r.license_year ?? "",
      money(r.total_price),
      money(r.deposit),
      r.comment ?? "",
      r.manager_note ?? "",
      r.locale,
      formatDateTime(r.created_at),
    ]
      .map((value) => (typeof value === "object" && value !== null && "raw" in value ? value.raw : cell(value)))
      .join(";");
  });

  const body = `\uFEFF${[header.map(cell).join(";"), ...lines].join("\r\n")}\r\n`;
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rezervacijos-${vilniusToday()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
