import { NextResponse, type NextRequest } from "next/server";
import { addDaysIso, isIsoDate, vilniusDayStart, vilniusToday } from "@/lib/dates";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";

/**
 * GET /api/availability?from=YYYY-MM-DD&to=YYYY-MM-DD
 * IDs of published cars that are free for the whole range (days in Vilnius time,
 * `to` inclusive). Used by the catalog date filter. No personal data.
 */
export async function GET(request: NextRequest) {
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");

  if (!isIsoDate(from) || !isIsoDate(to) || from > to) {
    return NextResponse.json({ error: "invalid_range" }, { status: 400 });
  }
  if (to < vilniusToday() || addDaysIso(from, 366) < to) {
    return NextResponse.json({ error: "range_out_of_bounds" }, { status: 400 });
  }
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  const { data, error } = await createPublicClient()
    .rpc("available_cars", {
      p_from: vilniusDayStart(from).toISOString(),
      p_to: vilniusDayStart(addDaysIso(to, 1)).toISOString(),
    })
    .select("id");

  if (error) {
    console.error("[availability]", error);
    return NextResponse.json({ error: "query_failed" }, { status: 502 });
  }

  return NextResponse.json(
    { from, to, carIds: data.map((row) => row.id) },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } },
  );
}
