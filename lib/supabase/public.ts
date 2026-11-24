import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { assertSupabaseEnv, supabaseAnonKey, supabaseUrl } from "./env";

/**
 * Anonymous, cookie-less client for the PUBLIC site (Server Components).
 * It never touches `cookies()`, so pages using it stay static / ISR-cacheable.
 * RLS limits it to published cars, their photos, busy periods and public settings.
 */
export function createPublicClient() {
  assertSupabaseEnv();
  return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
