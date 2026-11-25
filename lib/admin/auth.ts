import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const ADMIN_LOGIN_PATH = "/admin/prisijungimas";

export type StaffRole = "admin" | "manager";

/**
 * The signed-in staff member for this request (deduplicated with React `cache`),
 * or null. Everything the session client does is still limited by RLS.
 */
export const getStaff = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return null;

  return {
    supabase,
    user,
    profile,
    name: profile.full_name || user.email || "Naudotojas",
    isAdmin: profile.role === "admin",
  };
});

export type Staff = NonNullable<Awaited<ReturnType<typeof getStaff>>>;

/** Pages and actions of the panel: redirect to the login page without a staff session. */
export async function requireStaff(): Promise<Staff> {
  const staff = await getStaff();
  if (!staff) redirect(ADMIN_LOGIN_PATH);
  return staff;
}

/** Admin-only pages and actions (settings, users, deleting cars / categories). */
export async function requireAdmin(): Promise<Staff> {
  const staff = await requireStaff();
  if (!staff.isAdmin) redirect("/admin?klaida=teises");
  return staff;
}

/** Only same-site admin paths are allowed as a post-login destination (no open redirects). */
export function safeNextPath(value: unknown) {
  return typeof value === "string" && /^\/admin(\/[\w\-/]*)?$/.test(value) && !value.startsWith(ADMIN_LOGIN_PATH)
    ? value
    : "/admin";
}
