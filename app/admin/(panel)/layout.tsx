import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { LiveBookings } from "@/components/admin/LiveBookings";
import { requireStaff } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const staff = await requireStaff();
  const { count } = await staff.supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return (
    <AdminShell user={{ name: staff.name, role: staff.profile.role }} pendingCount={count ?? 0}>
      {children}
      <LiveBookings />
    </AdminShell>
  );
}
