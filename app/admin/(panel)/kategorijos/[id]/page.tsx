import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryEditor } from "@/components/admin/CategoryEditor";
import { PageHeader } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin/auth";
import { getGlobalTerms, listCategories } from "@/lib/admin/categories";

export const metadata: Metadata = { title: "Kategorija" };

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sukurta?: string }>;
}) {
  const [{ id }, { sukurta }] = await Promise.all([params, searchParams]);
  const isNew = id === "nauja";
  if (!isNew && !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const staff = await requireStaff();
  const [categories, global] = await Promise.all([listCategories(staff.supabase), getGlobalTerms(staff.supabase)]);
  const category = isNew ? null : categories.find((c) => c.id === id);
  if (!isNew && !category) notFound();

  return (
    <>
      <PageHeader
        back={
          <Link href="/admin/kategorijos" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
            <ArrowLeft className="size-4" aria-hidden /> Kategorijos
          </Link>
        }
        title={category ? category.name_lt : "Nauja kategorija"}
        description={
          category ? `Automobilių: ${category.carCount}` : "Pvz.: Premium, Prabangi, Visureigiai, Mikroautobusai."
        }
      />
      <CategoryEditor
        key={id}
        id={category?.id ?? null}
        initial={{
          nameLt: category?.name_lt ?? "",
          nameEn: category?.name_en ?? "",
          slug: category?.slug ?? "",
          descriptionLt: category?.description_lt ?? "",
          descriptionEn: category?.description_en ?? "",
          icon: category?.icon ?? "",
          sort: category?.sort ?? (categories.at(-1)?.sort ?? 0) + 10,
          pricing: category?.pricing ?? {},
          rules: category?.rules ?? {},
        }}
        globalPricing={global.pricing}
        globalRules={global.rules}
        carCount={category?.carCount ?? 0}
        isAdmin={staff.isAdmin}
        created={Boolean(sukurta)}
      />
    </>
  );
}
