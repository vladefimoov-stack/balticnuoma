import { ChevronRight, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SettingsForms, type SettingsValues } from "@/components/admin/SettingsForms";
import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { DEFAULT_CONTACTS, DEFAULT_OPENING_HOURS, DEFAULT_PRICING, DEFAULT_RENTAL_RULES } from "@/lib/data/defaults";
import { settingsSchemas } from "@/lib/db/json";
import { site } from "@/lib/config/site";

export const metadata: Metadata = { title: "Nustatymai" };

export default async function SettingsPage() {
  const staff = await requireAdmin();
  const { data } = await staff.supabase.from("settings").select("key, value");
  const byKey = new Map((data ?? []).map((s) => [s.key, s.value]));
  const read = <K extends keyof typeof settingsSchemas>(key: K, fallback: unknown) => {
    const parsed = settingsSchemas[key].safeParse(byKey.get(key));
    return parsed.success ? parsed.data : fallback;
  };

  const initial = {
    pricing: read("pricing", DEFAULT_PRICING),
    rental_rules: read("rental_rules", DEFAULT_RENTAL_RULES),
    contacts: read("contacts", {
      phone: DEFAULT_CONTACTS.phone,
      whatsapp_url: "",
      telegram_username: site.telegramUsername,
      email: "",
      address: DEFAULT_CONTACTS.address,
      office_open: false,
    }),
    opening_hours: read("opening_hours", DEFAULT_OPENING_HOURS),
    notifications: read("notifications", { booking_email: null }),
    company: read("company", {
      legal_name: "",
      company_code: "",
      vat_code: "",
      registered_address: "",
      privacy_email: "",
    }),
  } as SettingsValues;

  return (
    <>
      <PageHeader title="Nustatymai" description="Pakeitimai svetainėje matomi iš karto." />
      <Link
        href="/admin/nustatymai/naudotojai"
        className="mb-5 flex items-center justify-between gap-3 rounded-card border border-line bg-surface p-4 transition-colors hover:border-amber/40"
      >
        <span className="flex items-center gap-3">
          <Users className="size-5 text-amber" aria-hidden />
          <span>
            <span className="block font-medium">Naudotojai</span>
            <span className="text-sm text-muted">Administratoriai ir vadybininkai, slaptažodžiai</span>
          </span>
        </span>
        <ChevronRight className="size-4 text-muted" aria-hidden />
      </Link>
      <SettingsForms initial={initial} />
    </>
  );
}
