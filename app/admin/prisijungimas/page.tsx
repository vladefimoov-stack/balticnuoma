import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/LoginForm";
import { Logo } from "@/components/brand/Logo";
import { safeNextPath } from "@/lib/admin/auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Prisijungimas" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10 bg-aurora">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo className="h-8" />
          <p className="text-sm text-muted">Administravimas</p>
        </div>
        <div className="rounded-card border border-line bg-surface p-6 shadow-card">
          <h1 className="mb-5 font-display text-xl font-semibold">Prisijungimas</h1>
          {isSupabaseConfigured ? (
            <LoginForm next={safeNextPath(next)} />
          ) : (
            <p className="text-sm text-busy">Supabase nesukonfigūruotas — prisijungti negalima.</p>
          )}
        </div>
        <p className="text-center text-xs text-muted">
          Pamiršote slaptažodį? Kreipkitės į administratorių — jis gali nustatyti naują.
        </p>
      </div>
    </main>
  );
}
