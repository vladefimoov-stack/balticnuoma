import { ArrowRight, CalendarRange, Car, Gauge, Inbox, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Card, CardTitle, EmptyState, Notice, PageHeader } from "@/components/admin/ui";
import { buttonClasses } from "@/components/ui/Button";
import { requireStaff } from "@/lib/admin/auth";
import { getDashboard, UTILIZATION_DAYS, type DayEntry } from "@/lib/admin/dashboard";
import { formatDateTime, formatDuration, formatMoney, formatRange } from "@/lib/admin/format";
import { bookingNumber, formatSelection } from "@/lib/booking/format";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Apžvalga" };

function Stat({
  icon,
  label,
  value,
  hint,
  href,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  hint?: string;
  href?: string;
}) {
  const body = (
    <>
      <span className="grid size-10 place-items-center rounded-xl bg-amber/10 text-amber">{icon}</span>
      <span className="flex flex-col">
        <span className="text-xs text-muted">{label}</span>
        <span className="font-display text-2xl font-semibold tabular-nums">{value}</span>
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </span>
    </>
  );
  const className = "flex items-center gap-4 rounded-card border border-line bg-surface p-4 transition-colors";
  return href ? (
    <Link href={href} className={cn(className, "hover:border-amber/40")}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

const KIND: Record<DayEntry["kind"], { label: string; className: string }> = {
  start: { label: "Paėmimas", className: "bg-free/15 text-free" },
  last: { label: "Paskutinė diena", className: "bg-pending/15 text-pending" },
  startAndLast: { label: "Viena para", className: "bg-free/15 text-free" },
  ongoing: { label: "Tęsiasi", className: "bg-white/5 text-muted" },
  hourly: { label: "Valandinė", className: "bg-amber/15 text-amber" },
};

function DayList({ entries }: { entries: DayEntry[] }) {
  if (entries.length === 0) return <EmptyState>Patvirtintų rezervacijų nėra.</EmptyState>;
  return (
    <ul className="flex flex-col divide-y divide-line">
      {entries.map((e) => (
        <li key={e.id} className="relative flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
          <div className="min-w-0">
            <Link
              href={`/admin/rezervacijos/${e.id}`}
              className="font-medium after:absolute after:inset-0 hover:text-amber"
            >
              {e.car}
              {e.plate && <span className="ml-2 text-xs text-muted">{e.plate}</span>}
            </Link>
            <p className="text-sm text-muted">
              {e.customer} · {e.phone}
            </p>
            <p className="text-xs text-muted">{formatRange(e.range)}</p>
          </div>
          <span className={cn("rounded-pill px-2.5 py-1 text-xs font-semibold", KIND[e.kind].className)}>
            {KIND[e.kind].label}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ klaida?: string }> }) {
  const { klaida } = await searchParams;
  const staff = await requireStaff();
  const d = await getDashboard(staff.supabase);
  const day = (iso: string) => formatSelection({ mode: "days", startDate: iso, endDate: iso }, "lt");

  return (
    <>
      <PageHeader
        title="Apžvalga"
        description={`${day(d.today)} · ${staff.name}`}
        actions={
          <Link href="/admin/rezervacijos/nauja" className={buttonClasses({ size: "sm" })}>
            <Plus className="size-4" aria-hidden /> Nauja rezervacija
          </Link>
        }
      />
      {klaida === "teises" && (
        <Notice tone="warning" className="mb-5">
          Šis skyrius prieinamas tik administratoriui.
        </Notice>
      )}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={<Inbox className="size-5" aria-hidden />}
          label="Naujos užklausos"
          value={d.pendingCount}
          hint="laukia patvirtinimo"
          href="/admin/rezervacijos?status=pending"
        />
        <Stat
          icon={<Car className="size-5" aria-hidden />}
          label="Šiandien išnuomota"
          value={`${d.rentedToday} / ${d.carCount}`}
          hint="paskelbtų automobilių"
        />
        <Stat
          icon={<Gauge className="size-5" aria-hidden />}
          label={`Užimtumas, ${UTILIZATION_DAYS} d.`}
          value={`${d.utilization} %`}
          hint="pagal patvirtintas rezervacijas"
          href="/admin/kalendorius"
        />
        <Stat
          icon={<CalendarRange className="size-5" aria-hidden />}
          label="Paėmimai per 7 d."
          value={d.pickupsThisWeek}
          hint="patvirtintos rezervacijos"
          href="/admin/kalendorius"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardTitle
            aside={
              <Link
                href="/admin/rezervacijos?status=pending"
                className="inline-flex items-center gap-1 text-xs text-amber hover:underline"
              >
                Visos <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            }
          >
            Naujos užklausos
          </CardTitle>
          {d.pending.length === 0 ? (
            <EmptyState>Naujų užklausų nėra.</EmptyState>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {d.pending.map((b) => (
                <li
                  key={b.id}
                  className="relative flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/admin/rezervacijos/${b.id}`}
                      className="font-medium after:absolute after:inset-0 hover:text-amber"
                    >
                      <span className="text-amber">{bookingNumber(b.number)}</span> · {b.car?.title_lt ?? "—"}
                    </Link>
                    <p className="text-sm text-muted">
                      {formatRange(b.range)} · {formatDuration(b.range)} · {b.customer_first_name}{" "}
                      {b.customer_last_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium tabular-nums">{formatMoney(b.total_price)}</p>
                    <p className="text-xs text-muted">{formatDateTime(b.created_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitle>Šiandien · {day(d.today)}</CardTitle>
          <DayList entries={d.todayEntries} />
        </Card>
        <Card>
          <CardTitle>Rytoj · {day(d.tomorrow)}</CardTitle>
          <DayList entries={d.tomorrowEntries} />
        </Card>
      </div>
    </>
  );
}
