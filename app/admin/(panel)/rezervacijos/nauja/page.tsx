import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ManualBookingForm } from "@/components/admin/ManualBookingForm";
import { EmptyState, PageHeader } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin/auth";
import { isIsoDate, vilniusToday } from "@/lib/dates";

export const metadata: Metadata = { title: "Nauja rezervacija" };

/** Booking entered by staff — e.g. a customer who called about an ad. */
export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ car?: string; nuo?: string; iki?: string }>;
}) {
  const params = await searchParams;
  const staff = await requireStaff();
  const { data: cars } = await staff.supabase
    .from("cars")
    .select("id, title_lt, plate, status")
    .neq("status", "draft")
    .order("sort")
    .order("title_lt");

  const today = vilniusToday();
  const from = isIsoDate(params.nuo) ? params.nuo : today;
  const to = isIsoDate(params.iki) && params.iki >= from ? params.iki : from;
  const options = (cars ?? []).map((c) => ({ id: c.id, title: c.title_lt, plate: c.plate, status: c.status }));
  const carId = options.find((c) => c.id === params.car)?.id ?? options[0]?.id ?? "";

  return (
    <>
      <PageHeader
        back={
          <Link
            href="/admin/rezervacijos"
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"
          >
            <ArrowLeft className="size-4" aria-hidden /> Rezervacijos
          </Link>
        }
        title="Nauja rezervacija"
        description="Klientams, kurie skambina ar rašo, o ne rezervuoja svetainėje. Privalomi tik vardas, pavardė ir telefonas."
      />
      {options.length === 0 ? (
        <EmptyState>Pirmiausia pridėkite automobilį.</EmptyState>
      ) : (
        <ManualBookingForm
          cars={options}
          defaults={{ carId, from, to }}
          emailsEnabled={Boolean(process.env.RESEND_API_KEY?.trim())}
        />
      )}
    </>
  );
}
