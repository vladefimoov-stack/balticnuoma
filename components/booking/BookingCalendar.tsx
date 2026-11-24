"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { DayStatus } from "@/lib/booking/availability";
import { addDaysIso } from "@/lib/dates";
import { cn } from "@/lib/utils/cn";

type Props = {
  locale: string;
  /** First and last selectable dates ("YYYY-MM-DD", Vilnius). */
  minDate: string;
  maxDate: string;
  /** null while availability is loading — days render neutral and disabled. */
  statusOf: ((iso: string) => DayStatus) | null;
  isSelectable: (iso: string) => boolean;
  /** Selected range (inclusive). Single-day mode: only `start`. */
  start: string | null;
  end: string | null;
  /** Show a hover preview of the range while choosing its last day. */
  rangePreview: boolean;
  onSelect: (iso: string) => void;
};

const intlLocale = (locale: string) => (locale === "en" ? "en-GB" : "lt-LT");
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const monthOf = (date: string) => ({ y: Number(date.slice(0, 4)), m: Number(date.slice(5, 7)) - 1 });
const utc = (date: string) => new Date(`${date}T12:00:00Z`);
const capitalize = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1);

/** Monday-based weekday index (0 = Monday) of a "YYYY-MM-DD" date. */
const weekday = (date: string) => (utc(date).getUTCDay() + 6) % 7;

/**
 * Accessible availability calendar (APG grid pattern): one tab stop, arrow keys move
 * by day / week, Home / End to the week's edges, PageUp / PageDown by month,
 * Enter / Space selects. Busy days are red + struck through (not colour alone),
 * partly booked days are half red.
 */
export function BookingCalendar(props: Props) {
  const { locale, minDate, maxDate, statusOf, isSelectable, start, end, rangePreview, onSelect } = props;
  const t = useTranslations("booking");
  const [month, setMonth] = useState(() => monthOf(start ?? minDate));
  const [focused, setFocused] = useState(start ?? minDate);
  const [hovered, setHovered] = useState<string | null>(null);
  const gridRef = useRef<HTMLTableElement>(null);
  const moveFocus = useRef(false);

  const formats = useMemo(() => {
    const l = intlLocale(locale);
    return {
      month: new Intl.DateTimeFormat(l, { month: "long", timeZone: "UTC" }),
      weekdayShort: new Intl.DateTimeFormat(l, { weekday: "short", timeZone: "UTC" }),
      weekdayLong: new Intl.DateTimeFormat(l, { weekday: "long", timeZone: "UTC" }),
      day: new Intl.DateTimeFormat(l, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }),
    };
  }, [locale]);

  // Keyboard navigation: after the focused date changes, move DOM focus to it.
  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)?.focus();
  }, [focused, month]);

  const minMonth = monthOf(minDate);
  const maxMonth = monthOf(maxDate);
  const canPrev = month.y > minMonth.y || (month.y === minMonth.y && month.m > minMonth.m);
  const canNext = month.y < maxMonth.y || (month.y === maxMonth.y && month.m < maxMonth.m);

  function showMonth(y: number, m: number) {
    const date = new Date(Date.UTC(y, m, 1));
    const next = { y: date.getUTCFullYear(), m: date.getUTCMonth() };
    setMonth(next);
    return next;
  }

  function goTo(date: string) {
    const clamped = date < minDate ? minDate : date > maxDate ? maxDate : date;
    const target = monthOf(clamped);
    if (target.y !== month.y || target.m !== month.m) setMonth(target);
    moveFocus.current = true;
    setFocused(clamped);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTableElement>) {
    const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (event.key in steps) {
      goTo(addDaysIso(focused, steps[event.key]));
    } else if (event.key === "Home") {
      goTo(addDaysIso(focused, -weekday(focused)));
    } else if (event.key === "End") {
      goTo(addDaysIso(focused, 6 - weekday(focused)));
    } else if (event.key === "PageUp" || event.key === "PageDown") {
      const { y, m } = monthOf(focused);
      const d = Number(focused.slice(8, 10));
      const shifted = new Date(Date.UTC(y, m + (event.key === "PageUp" ? -1 : 1), 1));
      const last = new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, 0)).getUTCDate();
      goTo(iso(shifted.getUTCFullYear(), shifted.getUTCMonth(), Math.min(d, last)));
    } else {
      return;
    }
    event.preventDefault();
  }

  // Build the visible month: leading blanks + days, chunked into weeks.
  const daysInMonth = new Date(Date.UTC(month.y, month.m + 1, 0)).getUTCDate();
  const firstDate = iso(month.y, month.m, 1);
  const cells: (string | null)[] = [
    ...Array.from({ length: weekday(firstDate) }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => iso(month.y, month.m, i + 1)),
  ];
  while (cells.length % 7) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));

  // The focused date must be inside the visible month to stay reachable by Tab.
  const tabStop =
    focused.startsWith(firstDate.slice(0, 8)) && focused >= minDate && focused <= maxDate
      ? focused
      : (cells.find((c) => c && c >= minDate && c <= maxDate) ?? null);

  const previewEnd = rangePreview && start && !end && hovered && hovered > start ? hovered : null;
  const rangeEnd = end ?? previewEnd;

  const weekdayHeaders = Array.from({ length: 7 }, (_, i) => utc(addDaysIso("2024-01-01", i))); // a Monday

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            const next = showMonth(month.y, month.m - 1);
            setFocused(iso(next.y, next.m, 1) < minDate ? minDate : iso(next.y, next.m, 1));
          }}
          disabled={!canPrev}
          aria-label={t("calendar.prev")}
          className="grid size-10 place-items-center rounded-full border border-line text-fg transition-colors hover:border-amber/60 hover:text-amber disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <p className="font-display text-base font-semibold" aria-live="polite" id="booking-calendar-title">
          {capitalize(formats.month.format(utc(firstDate)))} {month.y}
        </p>
        <button
          type="button"
          onClick={() => {
            const next = showMonth(month.y, month.m + 1);
            setFocused(iso(next.y, next.m, 1));
          }}
          disabled={!canNext}
          aria-label={t("calendar.next")}
          className="grid size-10 place-items-center rounded-full border border-line text-fg transition-colors hover:border-amber/60 hover:text-amber disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>

      <table
        ref={gridRef}
        role="grid"
        aria-labelledby="booking-calendar-title"
        onKeyDown={onKeyDown}
        onMouseLeave={() => setHovered(null)}
        className="w-full table-fixed border-separate border-spacing-1"
      >
        <thead>
          <tr>
            {weekdayHeaders.map((d) => (
              <th
                key={d.toISOString()}
                scope="col"
                abbr={formats.weekdayLong.format(d)}
                className="pb-1 text-center text-[0.7rem] font-medium tracking-wide text-muted uppercase"
              >
                {formats.weekdayShort.format(d)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, w) => (
            <tr key={w}>
              {week.map((date, d) => {
                if (!date) return <td key={`blank-${w}-${d}`} />;
                const inBounds = date >= minDate && date <= maxDate;
                const status = statusOf && inBounds ? statusOf(date) : null;
                const selectable = Boolean(statusOf) && inBounds && isSelectable(date);
                const isEdge = date === start || date === end;
                const inRange = Boolean(start && rangeEnd && date > start && date < rangeEnd);
                const isPreviewEdge = !isEdge && date === previewEnd;
                const highlighted = isEdge || inRange || isPreviewEdge;
                const statusLabel = !inBounds
                  ? t("calendar.dayUnavailable")
                  : status === "busy"
                    ? t("calendar.dayBusy")
                    : status === "partial"
                      ? t("calendar.dayPartial")
                      : status === "free"
                        ? t("calendar.dayFree")
                        : t("calendar.loading");

                return (
                  <td key={date} role="gridcell" aria-selected={isEdge || inRange}>
                    <button
                      type="button"
                      data-date={date}
                      tabIndex={date === tabStop ? 0 : -1}
                      aria-disabled={!selectable}
                      aria-label={`${formats.day.format(utc(date))}, ${statusLabel}`}
                      onClick={() => {
                        setFocused(date);
                        if (selectable) onSelect(date);
                      }}
                      onMouseEnter={() => setHovered(date)}
                      onFocus={() => {
                        setFocused(date);
                        setHovered(date);
                      }}
                      className={cn(
                        "relative grid h-10 w-full place-items-center overflow-hidden rounded-lg text-sm tabular-nums transition-colors sm:h-11",
                        "focus-visible:z-10",
                        !inBounds && "cursor-default text-muted/35",
                        inBounds && !status && "animate-pulse bg-white/[0.03] text-muted",
                        // Status colours only on days that are not part of the selection.
                        !highlighted && status === "free" && "bg-free/12 text-fg",
                        !highlighted && status === "free" && selectable && "hover:bg-free/25",
                        !highlighted &&
                          status === "busy" &&
                          "cursor-not-allowed bg-busy/20 text-muted line-through decoration-busy/70",
                        !highlighted && status === "partial" && "calendar-partial text-fg",
                        inBounds && status && !selectable && status !== "busy" && "cursor-not-allowed opacity-60",
                        inRange && "bg-amber/25 text-fg",
                        isPreviewEdge && "bg-amber/40 text-fg",
                        isEdge && "bg-amber font-semibold text-on-amber hover:bg-amber",
                      )}
                    >
                      {Number(date.slice(8, 10))}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
