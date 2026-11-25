"use client";

import { Loader2, Lock, Plus, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition, type MouseEvent } from "react";
import { Button } from "@/components/ui/Button";
import { createBlock, deleteBlock } from "@/lib/admin/block-actions";
import type { ActionResult } from "@/lib/admin/booking-actions";
import type { TimelineCar, TimelineItem } from "@/lib/admin/calendar";
import { cn } from "@/lib/utils/cn";
import { adminInput, adminLabel, CarStatusBadge, Notice } from "./ui";

type Props = { days: string[]; today: string; cars: TimelineCar[]; items: TimelineItem[] };

const LANE = 30; // px per lane
const weekday = new Intl.DateTimeFormat("lt-LT", { weekday: "short", timeZone: "UTC" });
const month = new Intl.DateTimeFormat("lt-LT", { month: "long", timeZone: "UTC" });
const utc = (iso: string) => new Date(`${iso}T12:00:00Z`);
const isWeekend = (iso: string) => [0, 6].includes(utc(iso).getUTCDay());

/** Greedy lane assignment: confirmed bookings and blocks first (they never overlap), then requests. */
function assignLanes(items: TimelineItem[]) {
  const order = { confirmed: 0, block: 0, pending: 1 };
  const sorted = [...items].sort((a, b) => order[a.kind] - order[b.kind] || a.start - b.start);
  const laneEnds: number[] = [];
  const lanes = new Map<string, number>();
  for (const item of sorted) {
    let lane = laneEnds.findIndex((end) => end <= item.start + 1e-6);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = item.end;
    lanes.set(item.id, lane);
  }
  return { lanes, count: Math.max(1, laneEnds.length) };
}

const ITEM_CLASS: Record<TimelineItem["kind"], string> = {
  confirmed: "bg-busy/85 text-white hover:bg-busy",
  pending: "border border-pending/70 bg-pending/20 text-pending hover:bg-pending/30",
  block: "calendar-block text-silver hover:brightness-125",
};

export function FleetCalendar({ days, today, cars, items }: Props) {
  const [form, setForm] = useState<{ carId: string; from: string; to: string; reason: string } | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<TimelineItem | null>(null);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();

  const n = days.length;
  const todayIndex = days.indexOf(today);
  const rows = useMemo(
    () =>
      cars.map((car) => {
        const carItems = items.filter((i) => i.carId === car.id);
        return { car, items: carItems, ...assignLanes(carItems) };
      }),
    [cars, items],
  );

  function openForm(carId = cars[0]?.id ?? "", day = days[Math.max(0, todayIndex)] ?? days[0]) {
    setSelectedBlock(null);
    setResult(null);
    setForm({ carId, from: day, to: day, reason: "" });
  }

  function onTrackClick(event: MouseEvent<HTMLDivElement>, carId: string) {
    if (event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const index = Math.min(n - 1, Math.max(0, Math.floor(((event.clientX - rect.left) / rect.width) * n)));
    openForm(carId, days[index]);
  }

  const run = (action: () => Promise<ActionResult>, onOk?: () => void) =>
    start(async () => {
      const res = await action();
      setResult(res);
      if (res.ok) onOk?.();
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
          <li className="flex items-center gap-2">
            <span className="size-3 rounded-[4px] border border-pending/70 bg-pending/20" aria-hidden /> Užklausa (datų
            neužima)
          </li>
          <li className="flex items-center gap-2">
            <span className="size-3 rounded-[4px] bg-busy/85" aria-hidden /> Patvirtinta
          </li>
          <li className="flex items-center gap-2">
            <span className="size-3 rounded-[4px] calendar-block" aria-hidden /> Blokuota
          </li>
        </ul>
        <Button size="sm" variant="secondary" onClick={() => openForm()}>
          <Plus className="size-4" aria-hidden />
          Užblokuoti datas
        </Button>
      </div>

      {result && !form && !selectedBlock && (
        <Notice tone={result.ok ? "success" : "error"}>{result.ok ? result.message : result.error}</Notice>
      )}

      {form && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () => createBlock(form),
              () => setForm(null),
            );
          }}
          className="grid gap-3 rounded-card border border-line-strong bg-surface p-4 sm:grid-cols-2 lg:grid-cols-[1.3fr_0.9fr_0.9fr_1.4fr_auto]"
        >
          <label className="flex flex-col gap-1.5">
            <span className={adminLabel}>Automobilis</span>
            <select
              value={form.carId}
              onChange={(e) => setForm({ ...form, carId: e.target.value })}
              className={adminInput}
            >
              {cars.map((car) => (
                <option key={car.id} value={car.id}>
                  {car.title}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={adminLabel}>Nuo</span>
            <input
              type="date"
              required
              value={form.from}
              onChange={(e) =>
                setForm({ ...form, from: e.target.value, to: form.to < e.target.value ? e.target.value : form.to })
              }
              className={adminInput}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={adminLabel}>Iki (imtinai)</span>
            <input
              type="date"
              required
              min={form.from}
              value={form.to}
              onChange={(e) => setForm({ ...form, to: e.target.value })}
              className={adminInput}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={adminLabel}>Priežastis</span>
            <input
              value={form.reason}
              maxLength={500}
              placeholder="TO, remontas, savininko naudojimas…"
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className={adminInput}
            />
          </label>
          <div className="flex items-end gap-2">
            <Button type="submit" disabled={pending} className="h-11 flex-1">
              {pending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Lock className="size-4" aria-hidden />
              )}
              Užblokuoti
            </Button>
            <Button type="button" variant="ghost" className="h-11" onClick={() => setForm(null)} aria-label="Uždaryti">
              <X className="size-4" aria-hidden />
            </Button>
          </div>
          {result && !result.ok && (
            <Notice tone="error" className="sm:col-span-2 lg:col-span-5">
              {result.error}
            </Notice>
          )}
        </form>
      )}

      {selectedBlock && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line-strong bg-surface p-4">
          <div>
            <p className="font-medium">{selectedBlock.reason || "Blokuota"}</p>
            <p className="text-sm text-muted">
              {cars.find((c) => c.id === selectedBlock.carId)?.title} · {selectedBlock.detail}
            </p>
            {result && !result.ok && <p className="mt-1 text-sm text-busy">{result.error}</p>}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() =>
                run(
                  () => deleteBlock(selectedBlock.id),
                  () => setSelectedBlock(null),
                )
              }
              className="hover:border-busy/60 hover:text-busy"
            >
              {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
              Pašalinti blokavimą
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedBlock(null)} aria-label="Uždaryti">
              <X className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-card border border-line bg-surface" data-lenis-prevent>
        <div style={{ minWidth: `calc(7rem + ${n * 2.6}rem)` }}>
          {/* Header */}
          <div className="sticky top-0 z-20 flex border-b border-line bg-surface">
            <div className="sticky left-0 z-10 w-28 shrink-0 border-r border-line bg-surface px-3 py-2 text-xs text-muted sm:w-44">
              Automobilis
            </div>
            <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
              {days.map((day, i) => (
                <div
                  key={day}
                  className={cn(
                    "flex flex-col items-center py-1.5 text-[0.7rem] leading-tight",
                    isWeekend(day) ? "text-muted/70" : "text-muted",
                    day === today && "bg-amber/12 font-semibold text-amber",
                  )}
                >
                  <span className="h-3.5 self-start overflow-visible pl-1 whitespace-nowrap text-fg/80">
                    {i === 0 || day.endsWith("-01") ? month.format(utc(day)) : ""}
                  </span>
                  <span className="uppercase">{weekday.format(utc(day))}</span>
                  <span className="text-sm text-fg tabular-nums">{Number(day.slice(8))}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          {rows.map(({ car, items: carItems, lanes, count }) => (
            <div key={car.id} className="flex border-b border-line last:border-0">
              <div className="sticky left-0 z-10 flex w-28 shrink-0 flex-col justify-center gap-1 border-r border-line bg-surface px-3 py-2 sm:w-44">
                <Link
                  href={`/admin/automobiliai/${car.id}`}
                  className="truncate text-xs font-medium hover:text-amber sm:text-sm"
                >
                  {car.title}
                </Link>
                <span className="flex items-center gap-2 text-xs text-muted">
                  {car.plate}
                  {car.status !== "published" && <CarStatusBadge status={car.status} />}
                </span>
              </div>
              <div
                className="relative flex-1 cursor-copy"
                style={{ height: count * LANE + 12 }}
                onClick={(e) => onTrackClick(e, car.id)}
                title="Spustelėkite tuščią dieną, kad užblokuotumėte"
              >
                <div
                  className="pointer-events-none absolute inset-0 grid"
                  style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
                  aria-hidden
                >
                  {days.map((day) => (
                    <div
                      key={day}
                      className={cn(
                        "border-r border-line/60",
                        isWeekend(day) && "bg-white/[0.02]",
                        day === today && "bg-amber/[0.06]",
                      )}
                    />
                  ))}
                </div>
                {carItems.map((item) => {
                  const style = {
                    left: `calc(${(item.start / n) * 100}% + 2px)`,
                    width: `calc(${((item.end - item.start) / n) * 100}% - 4px)`,
                    top: 6 + (lanes.get(item.id) ?? 0) * LANE,
                    height: LANE - 6,
                  };
                  const className = cn(
                    "absolute z-[1] flex min-w-6 items-center overflow-hidden rounded-md px-2 text-left text-xs font-medium whitespace-nowrap transition",
                    ITEM_CLASS[item.kind],
                  );
                  const title = `${item.label} · ${item.detail}`;
                  return item.href ? (
                    <Link
                      key={item.id}
                      href={item.href}
                      style={style}
                      className={className}
                      title={title}
                      aria-label={title}
                    >
                      <span className="truncate">{item.label}</span>
                    </Link>
                  ) : (
                    <button
                      key={item.id}
                      type="button"
                      style={style}
                      className={className}
                      title={title}
                      aria-label={`Blokavimas: ${title}`}
                      onClick={() => {
                        setForm(null);
                        setResult(null);
                        setSelectedBlock(item);
                      }}
                    >
                      <Lock className="mr-1 size-3 shrink-0" aria-hidden />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {rows.length === 0 && <p className="p-6 text-center text-sm text-muted">Automobilių dar nėra.</p>}
        </div>
      </div>
    </div>
  );
}
