"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { CACHE_TAGS } from "@/lib/data/cache";
import { pricingOverrideSchema, rentalRulesOverrideSchema } from "@/lib/db/json";
import { SLUG_PATTERN } from "@/lib/utils/slug";
import { requireAdmin, requireStaff } from "./auth";
import type { ActionResult } from "./booking-actions";

const categorySchema = z.object({
  nameLt: z.string().trim().min(1, { error: "Įveskite pavadinimą lietuviškai." }).max(80),
  nameEn: z.string().trim().min(1, { error: "Įveskite pavadinimą angliškai." }).max(80),
  slug: z
    .string()
    .trim()
    .max(120)
    .regex(SLUG_PATTERN, { error: "Adresas: tik mažosios raidės, skaičiai ir brūkšneliai." }),
  descriptionLt: z.string().trim().max(500),
  descriptionEn: z.string().trim().max(500),
  icon: z.string().trim().max(60),
  sort: z.number().int().min(-10000).max(10000),
  pricing: pricingOverrideSchema,
  rules: rentalRulesOverrideSchema,
});
export type CategoryForm = z.input<typeof categorySchema>;

function refresh() {
  // Category tariffs feed every car's price on the public site.
  revalidateTag(CACHE_TAGS.categories);
  revalidateTag(CACHE_TAGS.cars);
  revalidatePath("/admin", "layout");
}

/** Create (id = null) or update a category. */
export async function saveCategory(
  categoryId: string | null,
  input: CategoryForm,
): Promise<ActionResult & { id?: string }> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const nested = ["pricing", "rules"].includes(String(issue.path[0]));
    return {
      ok: false,
      error: nested ? "Patikrinkite kainas ir reikalavimus (tik teigiami skaičiai)." : issue.message,
    };
  }
  const f = parsed.data;
  const staff = await requireStaff();
  const row = {
    name_lt: f.nameLt,
    name_en: f.nameEn,
    slug: f.slug,
    description_lt: f.descriptionLt || null,
    description_en: f.descriptionEn || null,
    icon: f.icon || null,
    sort: f.sort,
    default_pricing: f.pricing,
    default_rental_rules: f.rules,
  };
  const query = categoryId
    ? staff.supabase.from("categories").update(row).eq("id", categoryId).select("id").single()
    : staff.supabase.from("categories").insert(row).select("id").single();
  const { data, error } = await query;
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Toks adresas jau naudojamas kitai kategorijai." };
    console.error("[admin] save category failed:", error);
    return { ok: false, error: "Nepavyko išsaugoti kategorijos." };
  }
  refresh();
  if (!categoryId) redirect(`/admin/kategorijos/${data.id}?sukurta=1`);
  return { ok: true, message: "Kategorija išsaugota. Svetainė atnaujinta.", id: data.id };
}

/** Admin only; categories with cars can't be deleted (move the cars first). */
export async function deleteCategory(categoryId: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(categoryId).success) return { ok: false, error: "Neteisingas ID." };
  const staff = await requireAdmin();
  const { count } = await staff.supabase
    .from("cars")
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId);
  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: `Kategorijoje yra automobilių (${count}). Pirmiausia perkelkite juos į kitą kategoriją.`,
    };
  }
  const { error } = await staff.supabase.from("categories").delete().eq("id", categoryId);
  if (error) {
    console.error("[admin] delete category failed:", error);
    return { ok: false, error: "Nepavyko ištrinti kategorijos." };
  }
  refresh();
  redirect("/admin/kategorijos?istrinta=1");
}
