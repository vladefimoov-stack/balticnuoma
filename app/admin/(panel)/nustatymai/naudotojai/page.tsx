import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { UsersManager, type UserRow } from "@/components/admin/UsersManager";
import { Notice, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Naudotojai" };

export default async function UsersPage() {
  const staff = await requireAdmin();
  const { data: profiles } = await staff.supabase.from("profiles").select("id, full_name, role").order("created_at");

  let users: UserRow[] = [];
  let unavailable = false;
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { data } = await createAdminClient().auth.admin.listUsers({ perPage: 200 });
    users = (profiles ?? []).map((p) => {
      const auth = data?.users.find((u) => u.id === p.id);
      return {
        id: p.id,
        email: auth?.email ?? "—",
        name: p.full_name,
        role: p.role,
        lastSignIn: auth?.last_sign_in_at ?? null,
      };
    });
  } else {
    unavailable = true;
  }

  return (
    <>
      <PageHeader
        back={
          <Link href="/admin/nustatymai" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
            <ArrowLeft className="size-4" aria-hidden /> Nustatymai
          </Link>
        }
        title="Naudotojai"
        description="Kas gali prisijungti prie administravimo. Registracijos svetainėje nėra."
      />
      {unavailable ? (
        <Notice tone="warning">Naudotojų valdymui reikia SUPABASE_SERVICE_ROLE_KEY (Vercel nustatymuose).</Notice>
      ) : (
        <UsersManager users={users} meId={staff.user.id} />
      )}
    </>
  );
}
