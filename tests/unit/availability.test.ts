import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  dayBounds,
  dayRangeInterval,
  daysBetween,
  dayStatus,
  freeStartHours,
  hourlyInterval,
  isIntervalFree,
  type Interval,
} from "@/lib/booking/availability";

const iso = (s: string) => new Date(s).getTime();

describe("dayStatus (Vilnius days)", () => {
  // A day rental 1–3 Dec: [1 Dec 00:00, 3 Dec 00:00) Vilnius = UTC+2 in winter.
  const dayRental: Interval = dayRangeInterval("2030-12-01", "2030-12-03");
  // An hourly rental on 5 Dec 10:00–14:00.
  const hourly: Interval = hourlyInterval("2030-12-05", 10, 4);
  const busy = [dayRental, hourly];

  it("full-day bookings are busy", () => {
    assert.equal(dayStatus("2030-12-01", busy), "busy");
    assert.equal(dayStatus("2030-12-02", busy), "busy");
  });
  it("the return day is free again (half-open range)", () => assert.equal(dayStatus("2030-12-03", busy), "free"));
  it("an hourly booking makes the day partial", () => assert.equal(dayStatus("2030-12-05", busy), "partial"));
  it("uses Vilnius midnight, not UTC", () => {
    assert.equal(dayRental.start, iso("2030-11-30T22:00:00Z"));
    assert.equal(hourly.start, iso("2030-12-05T08:00:00Z"));
  });
  it("handles the 23-hour DST day (29 Mar 2026)", () => {
    const day = dayBounds("2026-03-29");
    assert.equal((day.end - day.start) / 3_600_000, 23);
    assert.equal(dayStatus("2026-03-29", [dayRangeInterval("2026-03-29", "2026-03-30")]), "busy");
  });
  it("merges two adjacent bookings that cover a whole day", () => {
    const morning = hourlyInterval("2030-12-07", 0, 12);
    const evening = hourlyInterval("2030-12-07", 12, 12);
    assert.equal(dayStatus("2030-12-07", [morning, evening]), "busy");
  });
});

describe("freeStartHours", () => {
  const busy = [hourlyInterval("2030-12-05", 10, 4)]; // 10:00–14:00
  it("lists start hours whose whole slot is free", () => {
    assert.deepEqual(freeStartHours("2030-12-05", 3, busy, 0), [7, 14, 15, 16, 17, 18, 19, 20, 21]);
  });
  it("skips slots starting within the next hour", () => {
    const now = hourlyInterval("2030-12-06", 15, 1).start; // 15:00
    assert.equal(freeStartHours("2030-12-06", 3, [], now)[0], 16);
  });
});

describe("ranges", () => {
  it("counts nights across DST", () => assert.equal(daysBetween("2026-03-28", "2026-03-31"), 3));
  it("detects overlap with an existing booking", () => {
    const busy = [dayRangeInterval("2030-12-01", "2030-12-03")];
    assert.equal(isIntervalFree(dayRangeInterval("2030-12-02", "2030-12-04"), busy), false);
    assert.equal(isIntervalFree(dayRangeInterval("2030-12-03", "2030-12-05"), busy), true);
  });
});
