import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FleetCalendar } from "@/components/admin/FleetCalendar";
import { PageHeader } from "@/components/admin/ui";
import { buttonClasses } from "@/components/ui/Button";
import { requireStaff } from "@/lib/admin/auth";
import { CALENDAR_DAYS, calendarStart, getCalendar } from "@/lib/admin/calendar";
import { formatSelection } from "@/lib/booking/format";
import { addDaysIso } from "@/lib/dates";

export const metadata: Metadata = { title: "Kalendorius" };

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ nuo?: string }> }) {
  const { nuo } = await searchParams;
  const from = calendarStart(nuo);
  const staff = await requireStaff();
  const data = await getCalendar(staff.supabase, from);
  const last = addDaysIso(from, CALENDAR_DAYS - 1);
  const step = 14;

  return (
    <>
      <PageHeader
        title="Kalendorius"
        description={`${formatSelection({ mode: "days", startDate: from, endDate: last }, "lt")} · Užklausos datų neužima, kol jų nepatvirtinate.`}
        actions={
          <>
            <Link href="/admin/rezervacijos/nauja" className={buttonClasses({ size: "sm" })}>
              <Plus className="size-4" aria-hidden /> Nauja rezervacija
            </Link>
            <Link
              href={`/admin/kalendorius?nuo=${addDaysIso(from, -step)}`}
              className={buttonClasses({ variant: "secondary", size: "sm" })}
              aria-label="Ankstesnės 2 savaitės"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </Link>
            <Link href="/admin/kalendorius" className={buttonClasses({ variant: "secondary", size: "sm" })}>
              Šiandien
            </Link>
            <Link
              href={`/admin/kalendorius?nuo=${addDaysIso(from, step)}`}
              className={buttonClasses({ variant: "secondary", size: "sm" })}
              aria-label="Kitos 2 savaitės"
            >
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          </>
        }
      />
      <FleetCalendar days={data.days} today={data.today} cars={data.cars} items={data.items} />
    </>
  );
}
