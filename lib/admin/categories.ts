import "server-only";
import { DEFAULT_PRICING, DEFAULT_RENTAL_RULES } from "@/lib/data/defaults";
import { pricingOverrideSchema, pricingSchema, rentalRulesOverrideSchema, rentalRulesSchema } from "@/lib/db/json";
import type { Staff } from "./auth";

type Db = Staff["supabase"];

export async function getGlobalTerms(db: Db) {
  const { data } = await db.from("settings").select("key, value").in("key", ["pricing", "rental_rules"]);
  const byKey = new Map((data ?? []).map((s) => [s.key, s.value]));
  const p = pricingSchema.safeParse(byKey.get("pricing"));
  const r = rentalRulesSchema.safeParse(byKey.get("rental_rules"));
  return { pricing: p.success ? p.data : DEFAULT_PRICING, rules: r.success ? r.data : DEFAULT_RENTAL_RULES };
}

export async function listCategories(db: Db) {
  const [categories, cars] = await Promise.all([
    db.from("categories").select("*").order("sort").order("name_lt"),
    db.from("cars").select("category_id, status"),
  ]);
  if (categories.error) throw categories.error;
  return categories.data.map((c) => {
    const pricing = pricingOverrideSchema.safeParse(c.default_pricing);
    const rules = rentalRulesOverrideSchema.safeParse(c.default_rental_rules);
    const own = (cars.data ?? []).filter((car) => car.category_id === c.id);
    return {
      ...c,
      pricing: pricing.success ? pricing.data : {},
      rules: rules.success ? rules.data : {},
      carCount: own.length,
      publishedCount: own.filter((car) => car.status === "published").length,
    };
  });
}
