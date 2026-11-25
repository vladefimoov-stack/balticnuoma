import { ArrowLeft, ExternalLink, Mail, MessageCircle, Phone } from "lucide-react";
import type { Metadata } from "next";
import { createTranslator } from "next-intl";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { BookingActions, ManagerNote } from "@/components/admin/BookingActions";
import { BookingStatusBadge, Card, CardTitle, Notice, PageHeader } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin/auth";
import { emailInputFromBooking } from "@/lib/admin/booking-email";
import { getBooking } from "@/lib/admin/bookings";
import { formatDateTime, formatDuration, formatMoney, formatRange, RENTAL_TYPE_LABEL } from "@/lib/admin/format";
import { bookingNumber, formatPrice } from "@/lib/booking/format";
import lt from "@/messages/lt.json";

type Params = { params: Promise<{ id: string }>; searchParams?: Promise<{ sukurta?: string; laiskas?: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  return { title: `Rezervacija ${id.slice(0, 8)}` };
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-line py-2.5 last:border-0 sm:flex-row sm:justify-between sm:gap-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm sm:text-right">{children}</dd>
    </div>
  );
}

export default async function BookingPage({ params, searchParams }: Params) {
  const { id } = await params;
  const { sukurta, laiskas } = (await searchParams) ?? {};
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const staff = await requireStaff();
  const detail = await getBooking(staff.supabase, id);
  if (!detail) notFound();

  const { booking: b, occupiedBy, otherRequests, creator } = detail;
  const fromAdmin = b.source === "admin";
  const t = createTranslator({ locale: "lt", messages: lt, namespace: "booking.lines" });
  const emailInput = emailInputFromBooking(b);
  const lines = emailInput?.quote.lines ?? [];
  const phoneDigits = b.customer_phone.replace(/\D/g, "");
  const experience = b.license_year ? new Date().getFullYear() - b.license_year : null;
  const taken = b.status === "pending" && occupiedBy.length > 0;

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
        title={
          <span className="flex flex-wrap items-center gap-3">
            {bookingNumber(b.number)}
            <BookingStatusBadge status={b.status} />
          </span>
        }
        description={
          fromAdmin
            ? `Įvesta administravime ${formatDateTime(b.created_at)}${creator ? ` · ${creator}` : ""}`
            : `Užklausa iš svetainės · ${formatDateTime(b.created_at)}`
        }
      />

      {sukurta && (
        <Notice tone="success" className="mb-5">
          Rezervacija įvesta.{laiskas ? " Klientui siunčiamas patvirtinimo laiškas." : ""}
        </Notice>
      )}
      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            <CardTitle>Rezervacija</CardTitle>
            <dl>
              <Row label="Automobilis">
                {b.car ? (
                  <span className="inline-flex flex-wrap items-center gap-2 sm:justify-end">
                    <Link href={`/admin/automobiliai/${b.car.id}`} className="font-medium text-amber hover:underline">
                      {b.car.title_lt}
                    </Link>
                    {b.car.plate && <span className="text-muted">{b.car.plate}</span>}
                    <a
                      href={`/automobiliai/${b.car.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Atidaryti automobilio puslapį svetainėje"
                      className="text-muted hover:text-fg"
                    >
                      <ExternalLink className="size-3.5" aria-hidden />
                    </a>
                  </span>
                ) : (
                  "—"
                )}
              </Row>
              <Row label="Laikotarpis">
                <span className="font-medium">{formatRange(b.range)}</span>
              </Row>
              <Row label="Trukmė">{formatDuration(b.range)}</Row>
              <Row label="Tarifas">{RENTAL_TYPE_LABEL[b.rental_type]}</Row>
              {lines.map((line, i) => (
                <Row key={i} label={t(line.kind, { count: line.quantity, price: formatPrice(line.unitPrice, "lt") })}>
                  {formatMoney(line.total)}
                </Row>
              ))}
              <Row label="Iš viso">
                <span className="font-display text-lg font-semibold">{formatMoney(b.total_price)}</span>
              </Row>
              <Row label="Užstatas">{formatMoney(b.deposit)}</Row>
            </dl>
          </Card>

          <Card>
            <CardTitle>Klientas</CardTitle>
            <dl>
              <Row label="Vardas, pavardė">
                <span className="font-medium">
                  {b.customer_first_name} {b.customer_last_name}
                </span>
              </Row>
              <Row label="Telefonas">
                <span className="inline-flex flex-wrap items-center gap-3 sm:justify-end">
                  <a
                    href={`tel:${b.customer_phone}`}
                    className="inline-flex items-center gap-1.5 text-amber hover:underline"
                  >
                    <Phone className="size-3.5" aria-hidden />
                    {b.customer_phone}
                  </a>
                  <a
                    href={`https://wa.me/${phoneDigits}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-muted hover:text-fg"
                  >
                    <MessageCircle className="size-3.5" aria-hidden />
                    WhatsApp
                  </a>
                </span>
              </Row>
              <Row label="El. paštas">
                {b.customer_email ? (
                  <a
                    href={`mailto:${b.customer_email}`}
                    className="inline-flex items-center gap-1.5 text-amber hover:underline"
                  >
                    <Mail className="size-3.5" aria-hidden />
                    {b.customer_email}
                  </a>
                ) : (
                  "—"
                )}
              </Row>
              <Row label="Vairuotojo pažymėjimas nuo">
                {b.license_year ? `${b.license_year} (${experience} m. stažas)` : "—"}
              </Row>
              {fromAdmin ? (
                <Row label="Įvesta">{`Administravime${creator ? ` · ${creator}` : ""}`}</Row>
              ) : (
                <>
                  <Row label="Patvirtino amžių ir stažą">{b.experience_confirmed ? "Taip" : "Ne"}</Row>
                  <Row label="Laiškų kalba">{b.locale === "en" ? "Anglų" : "Lietuvių"}</Row>
                  <Row label="Sutikimas su sąlygomis">{formatDateTime(b.terms_accepted_at)}</Row>
                </>
              )}
            </dl>
            {b.comment && (
              <div className="mt-3 rounded-xl border border-line bg-bg/50 p-3">
                <p className="mb-1 text-xs text-muted">Kliento komentaras</p>
                <p className="text-sm whitespace-pre-line">{b.comment}</p>
              </div>
            )}
          </Card>

          {(occupiedBy.length > 0 || otherRequests.length > 0) && (
            <Card>
              <CardTitle>Kiti įrašai šioms datoms</CardTitle>
              <ul className="flex flex-col gap-2 text-sm">
                {occupiedBy.map((o, i) => (
                  <li
                    key={i}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-busy/30 bg-busy/10 px-3 py-2"
                  >
                    {o.booking ? (
                      <Link href={`/admin/rezervacijos/${o.booking.id}`} className="font-medium hover:underline">
                        Patvirtinta {bookingNumber(o.booking.number)} · {o.booking.customer_first_name}{" "}
                        {o.booking.customer_last_name}
                      </Link>
                    ) : (
                      <span className="font-medium">Blokuota{o.block?.reason ? `: ${o.block.reason}` : ""}</span>
                    )}
                    <span className="text-muted">{formatRange(o.range)}</span>
                  </li>
                ))}
                {otherRequests.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-pending/30 bg-pending/10 px-3 py-2"
                  >
                    <Link href={`/admin/rezervacijos/${r.id}`} className="font-medium hover:underline">
                      Užklausa {bookingNumber(r.number)} · {r.customer_first_name} {r.customer_last_name}
                    </Link>
                    <span className="text-muted">{formatRange(r.range)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <Card>
            <CardTitle>Veiksmai</CardTitle>
            <BookingActions
              id={b.id}
              status={b.status}
              taken={taken}
              otherRequests={otherRequests.length}
              locale={b.locale}
            />
          </Card>
          <Card>
            <CardTitle>Vadybininko pastaba</CardTitle>
            <ManagerNote id={b.id} initial={b.manager_note ?? ""} />
          </Card>
          <Card>
            <CardTitle>Istorija</CardTitle>
            <dl>
              <Row label={fromAdmin ? "Įvesta" : "Gauta"}>{formatDateTime(b.created_at)}</Row>
              {b.status_changed_at && (
                <Row label="Būsena pakeista">
                  {formatDateTime(b.status_changed_at)}
                  {b.changer?.full_name ? ` · ${b.changer.full_name}` : ""}
                </Row>
              )}
              {b.rejection_reason && <Row label="Priežastis">{b.rejection_reason}</Row>}
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}
