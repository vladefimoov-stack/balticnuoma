import "server-only";
import { unstable_cache } from "next/cache";
import {
  carSpecsSchema,
  customSpecsSchema,
  featuresSchema,
  pricingOverrideSchema,
  rentalRulesOverrideSchema,
  resolveCarTerms,
  resolvePricing,
  resolveRentalRules,
  type CarSpecs,
  type CustomSpec,
  type Feature,
  type Pricing,
  type RentalRules,
} from "@/lib/db/json";
import { cleanHtml } from "@/lib/content/html";
import { fromPricePerDay } from "@/lib/pricing/display";
import { isSupabaseConfigured, storagePublicUrl } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";
import type { BodyType } from "@/lib/supabase/types";
import { CACHE_TAGS, PUBLIC_REVALIDATE_SECONDS } from "./cache";
import { getPublicSettings } from "./settings";

/* ── View models ──────────────────────────────────────────────────────────── */

/** A text that exists in Lithuanian and optionally in English (falls back to LT). */
export type L10n = { lt: string; en: string | null };

export function pick(text: L10n, locale: string): string {
  return locale === "en" && text.en ? text.en : text.lt;
}

export type CarImageView = {
  url: string;
  alt: L10n;
  width: number | null;
  height: number | null;
  blurDataUrl: string | null;
};

export type CategoryView = {
  id: string;
  slug: string;
  name: L10n;
  description: L10n;
  icon: string | null;
  sort: number;
  pricing: Pricing;
  rules: RentalRules;
  carCount: number;
};

export type CarListItem = {
  id: string;
  slug: string;
  title: L10n;
  category: { slug: string; name: L10n };
  make: string | null;
  model: string | null;
  year: number | null;
  bodyType: BodyType | null;
  specs: CarSpecs;
  cover: CarImageView | null;
  pricing: Pricing;
  deposit: number;
  rules: RentalRules;
  fromPerDay: number | null;
  sort: number;
};

export type CarDetail = CarListItem & {
  description: L10n;
  customSpecs: CustomSpec[];
  features: Feature[];
  images: CarImageView[];
  color: string | null;
};

/* ── Helpers ──────────────────────────────────────────────────────────────── */

const LIST_SELECT = `
  id, slug, year, body_type, title_lt, title_en, specs, price_overrides, deposit, rental_rules, sort,
  category:categories!inner ( slug, name_lt, name_en, default_pricing, default_rental_rules ),
  make:makes ( name ),
  vehicle_model:vehicle_models ( name ),
  images:car_images ( path, alt_lt, alt_en, width, height, blur_data_url, is_cover, sort )
`;

const DETAIL_SELECT = `${LIST_SELECT}, description_lt, description_en, custom_specs, features, color`;

type ImageRow = {
  path: string;
  alt_lt: string | null;
  alt_en: string | null;
  width: number | null;
  height: number | null;
  blur_data_url: string | null;
  is_cover: boolean;
  sort: number;
};

function toImage(row: ImageRow, fallbackAlt: L10n): CarImageView {
  return {
    url: storagePublicUrl("car-images", row.path),
    alt: { lt: row.alt_lt || fallbackAlt.lt, en: row.alt_en || fallbackAlt.en },
    width: row.width,
    height: row.height,
    blurDataUrl: row.blur_data_url,
  };
}

function sortImages(rows: ImageRow[]) {
  return [...rows].sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.sort - b.sort);
}


type ListRow = {
  id: string;
  slug: string;
  year: number | null;
  body_type: BodyType | null;
  title_lt: string;
  title_en: string | null;
  specs: unknown;
  price_overrides: unknown;
  deposit: number | null;
  rental_rules: unknown;
  sort: number;
  category: { slug: string; name_lt: string; name_en: string; default_pricing: unknown; default_rental_rules: unknown };
  make: { name: string } | null;
  vehicle_model: { name: string } | null;
  images: ImageRow[];
};

async function toListItem(row: ListRow): Promise<CarListItem> {
  const { pricing: globalPricing, rentalRules: globalRules } = await getPublicSettings();
  const { pricing, rules, deposit } = resolveCarTerms({
    globalPricing,
    globalRules,
    categoryPricing: row.category.default_pricing,
    categoryRules: row.category.default_rental_rules,
    carPricing: row.price_overrides,
    carRules: row.rental_rules,
    carDeposit: row.deposit,
  });
  const specs = carSpecsSchema.safeParse(row.specs);
  const title: L10n = { lt: row.title_lt, en: row.title_en };
  const images = sortImages(row.images ?? []);

  return {
    id: row.id,
    slug: row.slug,
    title,
    category: { slug: row.category.slug, name: { lt: row.category.name_lt, en: row.category.name_en } },
    make: row.make?.name ?? null,
    model: row.vehicle_model?.name ?? null,
    year: row.year,
    bodyType: row.body_type,
    specs: specs.success ? specs.data : {},
    cover: images[0] ? toImage(images[0], title) : null,
    pricing,
    deposit,
    rules,
    fromPerDay: fromPricePerDay(pricing),
    sort: row.sort,
  };
}

/* ── Queries ──────────────────────────────────────────────────────────────── */

async function fetchPublishedCars(): Promise<CarListItem[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await createPublicClient()
      .from("cars")
      .select(LIST_SELECT)
      .eq("status", "published")
      .order("sort")
      .order("created_at")
      .returns<ListRow[]>();
    if (error) throw error;
    return Promise.all(data.map(toListItem));
  } catch (error) {
    console.error("[cars] list failed:", error);
    return [];
  }
}

/** All published cars, in display order. */
export const getPublishedCars = unstable_cache(fetchPublishedCars, ["published-cars"], {
  tags: [CACHE_TAGS.cars, CACHE_TAGS.categories, CACHE_TAGS.settings],
  revalidate: PUBLIC_REVALIDATE_SECONDS,
});

type DetailRow = ListRow & {
  description_lt: string | null;
  description_en: string | null;
  custom_specs: unknown;
  features: unknown;
  color: string | null;
};

async function fetchCarBySlug(slug: string): Promise<CarDetail | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await createPublicClient()
      .from("cars")
      .select(DETAIL_SELECT)
      .eq("status", "published")
      .eq("slug", slug)
      .returns<DetailRow[]>()
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    const base = await toListItem(data);
    const customSpecs = customSpecsSchema.safeParse(data.custom_specs);
    const features = featuresSchema.safeParse(data.features);

    return {
      ...base,
      description: {
        lt: cleanHtml(data.description_lt),
        en: data.description_en ? cleanHtml(data.description_en) : null,
      },
      customSpecs: customSpecs.success ? customSpecs.data : [],
      features: features.success ? features.data : [],
      images: sortImages(data.images ?? []).map((img) => toImage(img, base.title)),
      color: data.color,
    };
  } catch (error) {
    console.error(`[cars] detail "${slug}" failed:`, error);
    return null;
  }
}

/** One published car by slug (null if missing / hidden). */
export const getCarBySlug = unstable_cache(fetchCarBySlug, ["car-by-slug"], {
  tags: [CACHE_TAGS.cars, CACHE_TAGS.categories, CACHE_TAGS.settings],
  revalidate: PUBLIC_REVALIDATE_SECONDS,
});

async function fetchCategories(): Promise<CategoryView[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const [{ pricing: globalPricing, rentalRules: globalRules }, cars, result] = await Promise.all([
      getPublicSettings(),
      getPublishedCars(),
      createPublicClient()
        .from("categories")
        .select(
          "id, slug, name_lt, name_en, description_lt, description_en, icon, sort, default_pricing, default_rental_rules",
        )
        .order("sort"),
    ]);
    if (result.error) throw result.error;

    return result.data.map((c) => {
      const p = pricingOverrideSchema.safeParse(c.default_pricing);
      const r = rentalRulesOverrideSchema.safeParse(c.default_rental_rules);
      return {
        id: c.id,
        slug: c.slug,
        name: { lt: c.name_lt, en: c.name_en },
        description: { lt: c.description_lt ?? "", en: c.description_en },
        icon: c.icon,
        sort: c.sort,
        pricing: resolvePricing(globalPricing, p.success ? p.data : null),
        rules: resolveRentalRules(globalRules, r.success ? r.data : null),
        carCount: cars.filter((car) => car.category.slug === c.slug).length,
      };
    });
  } catch (error) {
    console.error("[categories] failed:", error);
    return [];
  }
}

/** All categories with resolved default tariffs and the number of published cars. */
export const getCategories = unstable_cache(fetchCategories, ["categories"], {
  tags: [CACHE_TAGS.categories, CACHE_TAGS.cars, CACHE_TAGS.settings],
  revalidate: PUBLIC_REVALIDATE_SECONDS,
});
