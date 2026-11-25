import type { Metadata } from "next";
import { ComingSoon } from "@/components/admin/ComingSoon";
import { requireStaff } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Automobiliai" };

export default async function Page() {
  await requireStaff();
  return (
    <ComingSoon
      title="Automobiliai"
      text="Automobilių sąrašas, pridėjimo vedlys, nuotraukos ir kainos — ruošiama. Kol kas automobilius galima redaguoti Supabase lentelėje cars."
    />
  );
}
