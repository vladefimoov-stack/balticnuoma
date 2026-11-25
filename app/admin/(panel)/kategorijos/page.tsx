import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, Notice, PageHeader } from "@/components/admin/ui";
import { buttonClasses } from "@/components/ui/Button";
import { requireStaff } from "@/lib/admin/auth";
import { getGlobalTerms, listCategories } from "@/lib/admin/categories";
import { resolvePricing } from "@/lib/db/json";
import { fromPricePerDay } from "@/lib/pricing/display";

export const metadata: Metadata = { title: "Kategorijos" };

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ istrinta?: string; klaida?: string }>;
}) {
  const { istrinta, klaida } = await searchParams;
  const staff = await requireStaff();
  const [categories, global] = await Promise.all([listCategories(staff.supabase), getGlobalTerms(staff.supabase)]);

  return (
    <>
      <PageHeader
        title="Kategorijos"
        description="Automobilių klasės ir jų kainos bei reikalavimai pagal nutylėjimą."
        actions={
          <Link href="/admin/kategorijos/nauja" className={buttonClasses({ size: "sm" })}>
            <Plus className="size-4" aria-hidden /> Nauja kategorija
          </Link>
        }
      />
      {istrinta && (
        <Notice tone="success" className="mb-5">
          Kategorija ištrinta.
        </Notice>
      )}
      {klaida === "nera-kategoriju" && (
        <Notice tone="warning" className="mb-5">
          Pirmiausia sukurkite bent vieną kategoriją.
        </Notice>
      )}
      {categories.length === 0 ? (
        <EmptyState>Kategorijų dar nėra.</EmptyState>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {categories.map((c) => {
            const pricing = resolvePricing(global.pricing, c.pricing);
            const from = fromPricePerDay(pricing);
            return (
              <li
                key={c.id}
                className="relative flex flex-col gap-2 rounded-card border border-line bg-surface p-5 transition-colors hover:border-amber/40"
              >
                <Link
                  href={`/admin/kategorijos/${c.id}`}
                  className="font-display text-lg font-semibold after:absolute after:inset-0"
                >
                  {c.name_lt}
                </Link>
                <p className="text-sm text-muted">{c.description_lt || "—"}</p>
                <p className="mt-auto pt-2 text-sm">
                  {from !== null ? (
                    <>
                      nuo <strong>{from} €</strong> / parą
                    </>
                  ) : (
                    "paros nuoma išjungta"
                  )}{" "}
                  · užstatas {pricing.deposit} €
                </p>
                <p className="text-xs text-muted">
                  Automobilių: {c.carCount} (paskelbta {c.publishedCount}) · /{c.slug}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
