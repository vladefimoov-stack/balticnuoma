import type { Metadata } from "next";
import { ComingSoon } from "@/components/admin/ComingSoon";
import { requireAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Nustatymai" };

export default async function Page() {
  await requireAdmin();
  return (
    <ComingSoon title="Nustatymai" text="Tarifai, reikalavimai, kontaktai, darbo laikas ir naudotojai — ruošiama." />
  );
}
