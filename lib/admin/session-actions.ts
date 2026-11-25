"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { clientIp, consumeRateLimit, hashIp } from "@/lib/booking/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { ADMIN_LOGIN_PATH, safeNextPath } from "./auth";

export type SignInState = { error: "credentials" | "rate_limited" | "unavailable" | "invalid" } | null;

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().min(3).max(254),
  password: z.string().min(1).max(200),
  next: z.string().optional(),
});

/** Email + password sign-in for staff (public sign-up is disabled in Supabase Auth). */
export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) return { error: "invalid" };
  if (!isSupabaseConfigured) return { error: "unavailable" };

  // Slow down password guessing: 10 attempts per 15 minutes per IP (on top of Supabase's own limits).
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const key = `login:${hashIp(clientIp(await headers()))}`;
    if (!(await consumeRateLimit(createAdminClient(), key, 10, 900))) return { error: "rate_limited" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    if (error.status === 429) return { error: "rate_limited" };
    return { error: "credentials" };
  }
  redirect(safeNextPath(parsed.data.next));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(ADMIN_LOGIN_PATH);
}
