import type { Metadata } from "next";
import { ComingSoon } from "@/components/admin/ComingSoon";
import { requireStaff } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Kategorijos" };

export default async function Page() {
  await requireStaff();
  return <ComingSoon title="Kategorijos" text="Kategorijų kūrimas ir redagavimas ruošiamas." />;
}
