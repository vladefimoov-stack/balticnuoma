import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { assertSupabaseEnv, supabaseAnonKey, supabaseUrl } from "./env";

/**
 * Session-aware client for the ADMIN panel: Server Components, Server Actions and
 * Route Handlers. Acts as the logged-in staff member, so RLS applies.
 * (Reading cookies makes the route dynamic — don't use it on public pages.)
 */
export async function createClient() {
  assertSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // The admin middleware refreshes the session instead.
        }
      },
    },
  });
}
