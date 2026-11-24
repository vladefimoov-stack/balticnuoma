import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { describeKeyType, describeSupabaseUrlProblem } from "@/lib/supabase/diagnostics";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";

/**
 * GET /api/health — deployment self-check (also usable for uptime monitoring).
 * Reports which env vars are present, what kind of keys they hold and whether
 * Supabase works with the public and the secret key.
 * Never returns key values or personal data (the Supabase URL is public anyway).
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

/** PostgREST answers a HEAD+count request with a number; `null` means no real API answered. */
const NO_API_RESPONSE = "no answer from the Supabase API — check NEXT_PUBLIC_SUPABASE_URL";

const authSettingsSchema = z.object({ disable_signup: z.boolean().optional() });

export async function GET() {
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    NEXT_PUBLIC_SITE_URL: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
  };

  const anonKeyType = describeKeyType(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const secretKeyType = describeKeyType(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const urlProblem = describeSupabaseUrlProblem();

  const checks: Record<string, Check> = {
    supabaseUrl: { ok: urlProblem === null, detail: urlProblem ?? supabaseUrl },
    publicKeyType: {
      ok: anonKeyType === "publishable" || anonKeyType === "legacy-jwt:anon",
      detail: anonKeyType,
    },
    secretKeyType: {
      ok: secretKeyType === "secret" || secretKeyType === "legacy-jwt:service_role",
      detail: secretKeyType,
    },
  };

  if (isSupabaseConfigured) {
    const publicDb = createPublicClient();

    // Public key works and the seed is loaded: visitors see the published fleet.
    checks.publishedCars = await check(async () => {
      const { count, error } = await publicDb.from("cars").select("id", { count: "exact", head: true });
      if (error) return { ok: false, detail: error.message };
      if (count === null) return { ok: false, detail: NO_API_RESPONSE };
      return count > 0
        ? { ok: true, detail: count }
        : { ok: false, detail: "0 published cars — run supabase/seed.sql" };
    });

    // RLS works: drafts are invisible to visitors.
    checks.draftsHiddenFromVisitors = await check(async () => {
      const { count, error } = await publicDb
        .from("cars")
        .select("id", { count: "exact", head: true })
        .eq("status", "draft");
      if (error) return { ok: false, detail: error.message };
      if (count === null) return { ok: false, detail: NO_API_RESPONSE };
      return { ok: count === 0, detail: count };
    });

    // Secret key works: it can read private settings that visitors cannot.
    checks.secretKey = await check(async () => {
      const { count, error } = await createAdminClient().from("settings").select("key", { count: "exact", head: true });
      if (error) return { ok: false, detail: error.message };
      if (count === null) return { ok: false, detail: NO_API_RESPONSE };
      return count >= 6
        ? { ok: true, detail: count }
        : { ok: false, detail: `sees ${count} settings, expected ≥ 6 — not a secret key, or seed missing` };
    });

    // Public sign-up must be disabled (staff accounts are created by the admin).
    checks.signupDisabled = await check(async () => {
      const res = await fetch(`${supabaseUrl}/auth/v1/settings`, {
        headers: { apikey: supabaseAnonKey },
        cache: "no-store",
      });
      if (!res.ok) return { ok: false, detail: `HTTP ${res.status} from ${new URL(res.url).host}` };
      const settings = authSettingsSchema.parse(await res.json());
      return settings.disable_signup === true
        ? { ok: true, detail: true }
        : { ok: false, detail: "sign-up is enabled — turn off “Allow new users to sign up”" };
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
