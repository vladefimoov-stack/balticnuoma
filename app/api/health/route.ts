import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";

/**
 * GET /api/health — deployment self-check (also usable for uptime monitoring).
 * Reports which env vars are present and whether Supabase works with the public and
 * the secret key. Never returns key values or personal data.
 * 200 = everything OK, 503 = something needs attention (see `checks`).
 */
export const dynamic = "force-dynamic";

type Check = { ok: boolean; detail?: string | number | boolean | null };

async function check(fn: () => Promise<Check>): Promise<Check> {
  try {
    return await fn();
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : "unknown error" };
  }
}

const authSettingsSchema = z.object({ disable_signup: z.boolean().optional() });

export async function GET() {
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    NEXT_PUBLIC_SITE_URL: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
  };

  const checks: Record<string, Check> = {};

  if (isSupabaseConfigured) {
    const publicDb = createPublicClient();

    // Public key works and the seed is loaded: visitors see the published fleet.
    checks.publishedCars = await check(async () => {
      const { count, error } = await publicDb.from("cars").select("id", { count: "exact", head: true });
      if (error) return { ok: false, detail: error.message };
      return { ok: (count ?? 0) > 0, detail: count ?? 0 };
    });

    // RLS works: drafts are invisible to visitors.
    checks.draftsHiddenFromVisitors = await check(async () => {
      const { count, error } = await publicDb
        .from("cars")
        .select("id", { count: "exact", head: true })
        .eq("status", "draft");
      if (error) return { ok: false, detail: error.message };
      return { ok: count === 0, detail: count ?? 0 };
    });

    // Secret key works: it can read private settings that visitors cannot.
    checks.secretKey = await check(async () => {
      const { count, error } = await createAdminClient().from("settings").select("key", { count: "exact", head: true });
      if (error) return { ok: false, detail: error.message };
      const visible = count ?? 0;
      return visible >= 6
        ? { ok: true, detail: visible }
        : { ok: false, detail: `sees ${visible} settings, expected ≥ 6 — wrong key (publishable instead of secret?)` };
    });

    // Public sign-up must be disabled (staff accounts are created by the admin).
    checks.signupDisabled = await check(async () => {
      const res = await fetch(`${supabaseUrl}/auth/v1/settings`, {
        headers: { apikey: supabaseAnonKey },
        cache: "no-store",
      });
      if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
      const settings = authSettingsSchema.parse(await res.json());
      return { ok: settings.disable_signup === true, detail: settings.disable_signup ?? null };
    });
  }

  const ok = Object.values(env).every(Boolean) && Object.values(checks).every((c) => c.ok);

  return NextResponse.json(
    {
      status: ok ? "ok" : "attention",
      region: process.env.VERCEL_REGION ?? "local",
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? null,
      env,
      checks,
      checkedAt: new Date().toISOString(),
    },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
