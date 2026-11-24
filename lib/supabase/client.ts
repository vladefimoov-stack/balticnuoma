"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { assertSupabaseEnv, supabaseAnonKey, supabaseUrl } from "./env";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

/** Browser client for the admin panel (Realtime subscriptions, direct Storage uploads). */
export function getBrowserClient() {
  assertSupabaseEnv();
  browserClient ??= createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  return browserClient;
}
