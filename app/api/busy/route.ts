import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { addDaysIso, isIsoDate, vilniusDayStart } from "@/lib/dates";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";

const carId = z.uuid();

/**
 * GET /api/busy?car=<uuid>&from=YYYY-MM-DD&to=YYYY-MM-DD
 * Busy periods of one published car between two Vilnius days (`to` inclusive), for the
 * booking calendar: `{ busy: [[startMs, endMs], …] }`. No personal data, no statuses —
 * pending, confirmed and manual blocks all look the same. Not cached: a booking made a
 * second ago must already show as taken.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const car = params.get("car");
  const from = params.get("from");
  const to = params.get("to");

  if (!carId.safeParse(car).success || !isIsoDate(from) || !isIsoDate(to) || from > to) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }
  if (addDaysIso(from, 400) < to) {
    return NextResponse.json({ error: "range_too_long" }, { status: 400 });
  }
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  const { data, error } = await createPublicClient()
    .from("car_busy_periods")
    .select("starts_at, ends_at")
    .eq("car_id", car as string)
    .lt("starts_at", vilniusDayStart(addDaysIso(to, 1)).toISOString())
    .gt("ends_at", vilniusDayStart(from).toISOString())
    .order("starts_at");

  if (error) {
    console.error("[busy]", error);
    return NextResponse.json({ error: "query_failed" }, { status: 502 });
  }

  const busy = data
    .filter((row) => row.starts_at && row.ends_at)
    .map((row) => [Date.parse(row.starts_at as string), Date.parse(row.ends_at as string)]);

  return NextResponse.json({ busy }, { headers: { "Cache-Control": "no-store" } });
}
