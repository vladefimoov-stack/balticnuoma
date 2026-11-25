"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { CACHE_TAGS } from "@/lib/data/cache";
import { notificationsSchema, settingsSchemas } from "@/lib/db/json";
import { sendEmail } from "@/lib/email/send";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, requireStaff } from "./auth";
import type { ActionResult } from "./booking-actions";

const EDITABLE = ["pricing", "rental_rules", "contacts", "opening_hours", "notifications"] as const;
type EditableKey = (typeof EDITABLE)[number];

const MESSAGES: Record<EditableKey, string> = {
  pricing: "Patikrinkite tarifus (teigiami skaičiai, valandų 1–24, savaičių 2–104).",
  rental_rules: "Patikrinkite reikalavimus (amžius 18–99, stažas 0–60).",
  contacts: "Patikrinkite kontaktus: telefonas, WhatsApp nuoroda (https://…), el. paštas.",
  opening_hours: "Patikrinkite darbo laiką (formatas 09:00, bent viena diena).",
  notifications: "Neteisingas el. pašto adresas.",
};

/** Admin only. Every value is validated with the same zod contract the site reads it with. */
export async function saveSetting(key: EditableKey, value: unknown): Promise<ActionResult> {
  if (!EDITABLE.includes(key)) return { ok: false, error: "Neteisingas nustatymas." };
  const parsed = settingsSchemas[key].safeParse(value);
  if (!parsed.success) return { ok: false, error: MESSAGES[key] };
  const staff = await requireAdmin();
  const { error } = await staff.supabase
    .from("settings")
    .upsert({ key, value: parsed.data, is_public: key !== "notifications" }, { onConflict: "key" });
  if (error) {
    console.error(`[admin] setting ${key} failed:`, error);
    return { ok: false, error: "Nepavyko išsaugoti." };
  }
  // Tariffs and rules feed every car price; contacts and hours appear on every page.
  revalidateTag(CACHE_TAGS.settings);
  revalidateTag(CACHE_TAGS.cars);
  revalidateTag(CACHE_TAGS.categories);
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Išsaugota. Svetainė atnaujinta." };
}

/* ── Users (admin) ──────────────────────────────────────────────────────── */

const roleSchema = z.enum(["admin", "manager"]);
const passwordSchema = z.string().min(10, { error: "Slaptažodis turi būti bent 10 simbolių." }).max(72);

function serviceClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createAdminClient();
}

async function adminCount() {
  const staff = await requireAdmin();
  const { count } = await staff.supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  return { staff, admins: count ?? 0 };
}

export async function createUser(input: {
  email: string;
  password: string;
  name: string;
  role: string;
}): Promise<ActionResult> {
  const parsed = z
    .object({
      email: z
        .string()
        .trim()
        .toLowerCase()
        .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, { error: "Neteisingas el. paštas." }),
      password: passwordSchema,
      name: z.string().trim().min(1, { error: "Įveskite vardą." }).max(120),
      role: roleSchema,
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  await requireAdmin();
  const { error } = await serviceClient().auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.name },
    app_metadata: { role: parsed.data.role },
  });
  if (error) {
    if (/already/i.test(error.message)) return { ok: false, error: "Toks naudotojas jau yra." };
    console.error("[admin] create user failed:", error);
    return { ok: false, error: "Nepavyko sukurti naudotojo." };
  }
  revalidatePath("/admin/nustatymai/naudotojai");
  return { ok: true, message: `Naudotojas sukurtas. Perduokite jam el. paštą ir slaptažodį — prisijungimas /admin.` };
}

export async function setUserRole(userId: string, role: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(userId).success || !roleSchema.safeParse(role).success)
    return { ok: false, error: "Neteisingi duomenys." };
  const { staff, admins } = await adminCount();
  if (userId === staff.user.id && role !== "admin")
    return { ok: false, error: "Savo administratoriaus teisių atimti negalite." };
  if (role !== "admin" && admins <= 1) return { ok: false, error: "Turi likti bent vienas administratorius." };
  const { error } = await staff.supabase
    .from("profiles")
    .update({ role: role as "admin" | "manager" })
    .eq("id", userId);
  if (error) return { ok: false, error: "Nepavyko pakeisti rolės." };
  // Keep app_metadata in sync (used if the profile is ever re-created).
  await serviceClient().auth.admin.updateUserById(userId, { app_metadata: { role } });
  revalidatePath("/admin/nustatymai/naudotojai");
  return { ok: true, message: "Rolė pakeista." };
}

export async function setUserPassword(userId: string, password: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(userId).success) return { ok: false, error: "Neteisingas ID." };
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  await requireAdmin();
  const { error } = await serviceClient().auth.admin.updateUserById(userId, { password: parsed.data });
  if (error) return { ok: false, error: "Nepavyko pakeisti slaptažodžio." };
  return { ok: true, message: "Naujas slaptažodis nustatytas. Perduokite jį naudotojui saugiu būdu." };
}

export async function deleteUser(userId: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(userId).success) return { ok: false, error: "Neteisingas ID." };
  const { staff } = await adminCount();
  if (userId === staff.user.id) return { ok: false, error: "Savęs ištrinti negalite." };
  const { data: target } = await staff.supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (target?.role === "admin") return { ok: false, error: "Pirmiausia pakeiskite rolę į vadybininką." };
  const { error } = await serviceClient().auth.admin.deleteUser(userId);
  if (error) return { ok: false, error: "Nepavyko ištrinti naudotojo." };
  revalidatePath("/admin/nustatymai/naudotojai");
  return { ok: true, message: "Naudotojas ištrintas." };
}

/* ── My account (any staff member) ──────────────────────────────────────── */

export async function updateMyName(name: string): Promise<ActionResult> {
  const value = name.trim().slice(0, 120);
  if (!value) return { ok: false, error: "Įveskite vardą." };
  const staff = await requireStaff();
  const { error } = await staff.supabase.from("profiles").update({ full_name: value }).eq("id", staff.user.id);
  if (error) return { ok: false, error: "Nepavyko išsaugoti." };
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Vardas išsaugotas." };
}

export async function changeMyPassword(password: string, repeat: string): Promise<ActionResult> {
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (password !== repeat) return { ok: false, error: "Slaptažodžiai nesutampa." };
  const staff = await requireStaff();
  const { error } = await staff.supabase.auth.updateUser({ password: parsed.data });
  if (error) {
    if (/same/i.test(error.message)) return { ok: false, error: "Naujas slaptažodis turi skirtis nuo dabartinio." };
    return { ok: false, error: "Nepavyko pakeisti slaptažodžio." };
  }
  return { ok: true, message: "Slaptažodis pakeistas." };
}

/* ── Test email (admin) ─────────────────────────────────────────────────── */

export async function sendTestEmail(): Promise<ActionResult> {
  const staff = await requireAdmin();
  const { data } = await staff.supabase.from("settings").select("value").eq("key", "notifications").maybeSingle();
  const parsed = notificationsSchema.safeParse(data?.value);
  const to = (parsed.success && parsed.data.booking_email) || process.env.BOOKING_NOTIFY_EMAIL?.trim();
  if (!to) return { ok: false, error: "Nenurodytas vadybininko el. paštas — įrašykite ir išsaugokite jį aukščiau." };

  const time = new Date().toLocaleString("lt-LT", { timeZone: "Europe/Vilnius" });
  const res = await sendEmail({
    to,
    subject: "Bandomasis laiškas — Baltic Nuoma",
    text: `Laiškai iš svetainės veikia.\n\nIšsiųsta ${time} iš administravimo (Nustatymai → Pranešimai).`,
    html: `<p style="font-family:Arial,sans-serif;font-size:15px">Laiškai iš svetainės veikia ✔</p><p style="font-family:Arial,sans-serif;font-size:13px;color:#5b616b">Išsiųsta ${time} iš administravimo (Nustatymai → Pranešimai).</p>`,
  });
  if (res.sent) {
    return {
      ok: true,
      message: `Išsiųsta adresu ${to}. Jei laiško nėra per kelias minutes — patikrinkite „Spam“ aplanką ir Resend → Emails.`,
    };
  }
  if (res.reason === "not_configured") {
    return {
      ok: false,
      error: "RESEND_API_KEY šiame diegime nenustatytas: pridėkite jį Vercel ir paspauskite Redeploy.",
    };
  }
  return { ok: false, error: `Resend laiško nepriėmė: ${res.message ?? "nežinoma klaida"}` };
}
