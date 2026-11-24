import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { assertSupabaseEnv, supabaseUrl } from "./env";

/**
 * Service-role client — BYPASSES RLS. Server-only, for trusted operations:
 * creating public booking requests (after validation, rate limit, honeypot),
 * Vercel Cron jobs (3D polling) and Storage signed URLs.
 * Never import this from a Client Component or return its data unfiltered.
 */
export function createAdminClient() {
  assertSupabaseEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");

  return createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
