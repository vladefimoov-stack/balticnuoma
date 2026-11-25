import { AlertTriangle, Download, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BookingStatusBadge, EmptyState, PageHeader, adminInput, adminLabel } from "@/components/admin/ui";
import { buttonClasses } from "@/components/ui/Button";
import { requireStaff } from "@/lib/admin/auth";
import {
  filtersToQuery,
  listBookings,
  PAGE_SIZE,
  parseBookingFilters,
  type BookingFilters,
  type BookingListRow,
} from "@/lib/admin/bookings";
import { formatDateTime, formatDuration, formatMoney, formatRange } from "@/lib/admin/format";
import { bookingNumber } from "@/lib/booking/format";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Rezervacijos" };

const STATUS_TABS: Array<{ value: BookingFilters["status"]; label: string }> = [
  { value: "all", label: "Visos" },
  { value: "pending", label: "Laukia" },
  { value: "confirmed", label: "Patvirtintos" },
  { value: "rejected", label: "Atmestos" },
  { value: "cancelled", label: "Atšauktos" },
];

function Hints({ row }: { row: BookingListRow }) {
  if (row.status !== "pending" || (!row.taken && row.otherRequests === 0)) return null;
  return (
    <span className="flex flex-wrap gap-1.5">
      {row.taken && (
        <span className="inline-flex items-center gap-1 rounded-pill bg-busy/15 px-2 py-0.5 text-[0.7rem] font-medium text-busy">
          <AlertTriangle className="size-3" aria-hidden /> Datos užimtos
        </span>
      )}
      {row.otherRequests > 0 && (
        <span className="inline-flex items-center gap-1 rounded-pill bg-pending/15 px-2 py-0.5 text-[0.7rem] font-medium text-pending">
          <Users className="size-3" aria-hidden /> +{row.otherRequests} užkl.
        </span>
      )}
    </span>
  );
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseBookingFilters(await searchParams);
  const staff = await requireStaff();
  const [{ rows, total }, cars, pendingCount] = await Promise.all([
    listBookings(staff.supabase, filters),
    staff.supabase.from("cars").select("id, title_lt").neq("status", "draft").order("sort").order("title_lt"),
    staff.supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const csvQuery = filtersToQuery({ ...filters, page: 1 });
  const hasFilters = Boolean(filters.car || filters.from || filters.to || filters.q);

  return (
    <>
      <PageHeader
        title="Rezervacijos"
        description="Užklausos iš svetainės ir patvirtintos rezervacijos. Užklausa datų neužblokuoja, kol jos nepatvirtinate."
        actions={
          <a
            href={`/admin/rezervacijos/csv${csvQuery ? `?${csvQuery}` : ""}`}
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            <Download className="size-4" aria-hidden />
            CSV
          </a>
        }
      />

      <nav aria-label="Būsena" className="-mx-1 mb-4 flex gap-1 overflow-x-auto px-1 pb-1">
        {STATUS_TABS.map((tab) => {
          const active = filters.status === tab.value;
          const query = filtersToQuery({ ...filters, status: tab.value, page: 1 });
          return (
            <Link
              key={tab.value}
              href={`/admin/rezervacijos${query ? `?${query}` : ""}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-9 shrink-0 items-center gap-1.5 rounded-pill border px-3.5 text-sm transition-colors",
                active ? "border-amber/50 bg-amber/12 text-amber" : "border-line text-muted hover:text-fg",
              )}
            >
              {tab.label}
              {tab.value === "pending" && (pendingCount.count ?? 0) > 0 && (
                <span className="rounded-pill bg-pending px-1.5 text-[0.7rem] font-bold text-on-amber">
                  {pendingCount.count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <form
        method="get"
        className="mb-6 grid gap-3 rounded-card border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_0.8fr_0.8fr_auto]"
      >
        {filters.status !== "all" && <input type="hidden" name="status" value={filters.status} />}
        <label className="flex flex-col gap-1.5">
          <span className={adminLabel}>Paieška</span>
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="Vardas, telefonas, el. paštas, BN-…"
            className={adminInput}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={adminLabel}>Automobilis</span>
          <select name="car" defaultValue={filters.car ?? ""} className={adminInput}>
            <option value="">Visi</option>
            {(cars.data ?? []).map((car) => (
              <option key={car.id} value={car.id}>
                {car.title_lt}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={adminLabel}>Nuo</span>
          <input type="date" name="from" defaultValue={filters.from} className={adminInput} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={adminLabel}>Iki</span>
          <input type="date" name="to" defaultValue={filters.to} className={adminInput} />
        </label>
        <div className="flex items-end gap-2">
          <button type="submit" className={buttonClasses({ size: "md", className: "h-11 flex-1 lg:flex-none" })}>
            Filtruoti
          </button>
          {hasFilters && (
            <Link
              href={`/admin/rezervacijos${filters.status !== "all" ? `?status=${filters.status}` : ""}`}
              className={buttonClasses({ variant: "ghost", size: "md", className: "h-11" })}
            >
              Išvalyti
            </Link>
          )}
        </div>
      </form>

      {rows.length === 0 ? (
        <EmptyState>Rezervacijų nerasta.</EmptyState>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-card border border-line md:block">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left text-xs text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Nr.
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Būsena
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Automobilis / laikotarpis
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Klientas
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Suma
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Gauta
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "relative transition-colors hover:bg-white/[0.03]",
                      row.status === "pending" && "bg-pending/[0.04]",
                    )}
                  >
                    <td className="px-4 py-3 align-top">
                      <Link
                        href={`/admin/rezervacijos/${row.id}`}
                        className="font-semibold text-amber after:absolute after:inset-0 hover:underline"
                      >
                        {bookingNumber(row.number)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-col items-start gap-1.5">
                        <BookingStatusBadge status={row.status} />
                        <Hints row={row} />
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="font-medium">{row.car?.title_lt ?? "—"}</p>
                      <p className="text-muted">
                        {formatRange(row.range)} · {formatDuration(row.range)}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p>
                        {row.customer_first_name} {row.customer_last_name}
                      </p>
                      <p className="text-muted">{row.customer_phone}</p>
                    </td>
                    <td className="px-4 py-3 text-right align-top font-medium tabular-nums">
                      {formatMoney(row.total_price)}
                    </td>
                    <td className="px-4 py-3 text-right align-top whitespace-nowrap text-muted">
                      {formatDateTime(row.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phone cards */}
          <ul className="flex flex-col gap-3 md:hidden">
            {rows.map((row) => (
              <li
                key={row.id}
                className={cn(
                  "relative rounded-card border border-line bg-surface p-4",
                  row.status === "pending" && "border-pending/30",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/admin/rezervacijos/${row.id}`}
                    className="font-semibold text-amber after:absolute after:inset-0"
                  >
                    {bookingNumber(row.number)}
                  </Link>
                  <BookingStatusBadge status={row.status} />
                </div>
                <p className="mt-2 font-medium">{row.car?.title_lt ?? "—"}</p>
                <p className="text-sm text-muted">
                  {formatRange(row.range)} · {formatDuration(row.range)}
                </p>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <p className="text-sm">
                    {row.customer_first_name} {row.customer_last_name}
                    <span className="block text-muted">{row.customer_phone}</span>
                  </p>
                  <p className="font-medium tabular-nums">{formatMoney(row.total_price)}</p>
                </div>
                <div className="mt-2">
                  <Hints row={row} />
                </div>
              </li>
            ))}
          </ul>

          {pages > 1 && (
            <nav aria-label="Puslapiai" className="mt-6 flex items-center justify-between gap-3 text-sm">
              <span className="text-muted">
                Rodoma {(filters.page - 1) * PAGE_SIZE + 1}–{Math.min(filters.page * PAGE_SIZE, total)} iš {total}
              </span>
              <div className="flex gap-2">
                {filters.page > 1 && (
                  <Link
                    href={`/admin/rezervacijos?${filtersToQuery({ ...filters, page: filters.page - 1 })}`}
                    className={buttonClasses({ variant: "secondary", size: "sm" })}
                  >
                    Ankstesni
                  </Link>
                )}
                {filters.page < pages && (
                  <Link
                    href={`/admin/rezervacijos?${filtersToQuery({ ...filters, page: filters.page + 1 })}`}
                    className={buttonClasses({ variant: "secondary", size: "sm" })}
                  >
                    Kiti
                  </Link>
                )}
              </div>
            </nav>
          )}
        </>
      )}
    </>
  );
}
