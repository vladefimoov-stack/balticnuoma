import type { Metadata } from "next";
import { ComingSoon } from "@/components/admin/ComingSoon";
import { requireStaff } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Automobilis" };

export default async function Page() {
  await requireStaff();
  return <ComingSoon title="Automobilis" text="Automobilio redagavimas ruošiamas." />;
}
