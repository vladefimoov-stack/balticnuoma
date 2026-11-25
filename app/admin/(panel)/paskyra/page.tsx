import type { Metadata } from "next";
import { AccountForms } from "@/components/admin/UsersManager";
import { PageHeader } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Mano paskyra" };

export default async function AccountPage() {
  const staff = await requireStaff();
  return (
    <>
      <PageHeader
        title="Mano paskyra"
        description={`${staff.user.email} · ${staff.isAdmin ? "Administratorius" : "Vadybininkas"}`}
      />
      <AccountForms name={staff.profile.full_name ?? ""} />
    </>
  );
}
