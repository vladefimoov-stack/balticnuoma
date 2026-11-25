import "server-only";
import { DEFAULT_PRICING, DEFAULT_RENTAL_RULES } from "@/lib/data/defaults";
import {
  carSpecsSchema,
  customSpecsSchema,
  featuresSchema,
  pricingOverrideSchema,
  pricingSchema,
  rentalRulesOverrideSchema,
  rentalRulesSchema,
  type Pricing,
  type PricingOverride,
  type RentalRules,
  type RentalRulesOverride,
} from "@/lib/db/json";
import { rangeLiteral } from "@/lib/db/range";
import { storagePublicUrl } from "@/lib/supabase/env";
import type { BodyType, CarStatus } from "@/lib/supabase/types";
import type { Staff } from "./auth";
import type { CarForm } from "./car-schema";

type Db = Staff["supabase"];

export type CarListRow = {
  id: string;
  slug: string;
  title: string;
  plate: string | null;
  status: CarStatus;
  year: number | null;
  category: string;
  cover: string | null;
  photos: number;
  upcoming: number;
};

export async function listCars(db: Db): Promise<CarListRow[]> {
  const [cars, bookings] = await Promise.all([
    db
      .from("cars")
      .select(
        "id, slug, title_lt, plate, status, year, sort, category:categories!cars_category_id_fkey ( name_lt ), images:car_images ( path, is_cover, sort )",
      )
      .order("sort")
      .order("created_at"),
    db
      .from("bookings")
      .select("car_id")
      .in("status", ["pending", "confirmed"])
      .overlaps("period", rangeLiteral(Date.now(), Date.UTC(2200, 0, 1))),
  ]);
  if (cars.error) throw cars.error;
  const upcoming = new Map<string, number>();
  for (const b of bookings.data ?? []) upcoming.set(b.car_id, (upcoming.get(b.car_id) ?? 0) + 1);

  return cars.data.map((c) => {
    const images = [...(c.images ?? [])].sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.sort - b.sort);
    return {
      id: c.id,
      slug: c.slug,
      title: c.title_lt,
      plate: c.plate,
      status: c.status,
      year: c.year,
      category: c.category?.name_lt ?? "—",
      cover: images[0] ? storagePublicUrl("car-images", images[0].path) : null,
      photos: images.length,
      upcoming: upcoming.get(c.id) ?? 0,
    };
  });
}

export type EditorImage = {
  id: string;
  path: string;
  url: string;
  altLt: string;
  altEn: string;
  width: number | null;
  height: number | null;
  isCover: boolean;
};

export type EditorCategory = {
  id: string;
  name: string;
  pricing: PricingOverride;
  rules: RentalRulesOverride;
};

/** Everything the car editor needs: the car as a form, photos, categories, makes/models, inherited terms. */
export async function getCarEditor(db: Db, id: string) {
  const [car, images, categories, makes, models, settings] = await Promise.all([
    db
      .from("cars")
      .select(
        "*, make:makes!cars_make_id_fkey ( name ), vehicle_model:vehicle_models!cars_vehicle_model_id_fkey ( name )",
      )
      .eq("id", id)
      .maybeSingle(),
    db
      .from("car_images")
      .select("id, path, alt_lt, alt_en, width, height, is_cover, sort")
      .eq("car_id", id)
      .order("sort"),
    db.from("categories").select("id, name_lt, default_pricing, default_rental_rules").order("sort"),
    db.from("makes").select("id, name").order("name"),
    db.from("vehicle_models").select("id, make_id, name, body_type").order("name"),
    db.from("settings").select("key, value").in("key", ["pricing", "rental_rules"]),
  ]);
  for (const r of [car, images, categories, makes, models, settings]) if (r.error) throw r.error;
  const c = car.data;
  if (!c) return null;

  const parse = <T>(
    schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false } },
    v: unknown,
    fallback: T,
  ) => {
    const r = schema.safeParse(v);
    return r.success ? r.data : fallback;
  };
  const byKey = new Map((settings.data ?? []).map((s) => [s.key, s.value]));

  const form: CarForm = {
    categoryId: c.category_id,
    make: c.make?.name ?? "",
    model: c.vehicle_model?.name ?? "",
    year: c.year,
    bodyType: c.body_type,
    titleLt: c.title_lt,
    titleEn: c.title_en ?? "",
    slug: c.slug,
    plate: c.plate ?? "",
    color: c.color ?? "",
    descriptionLt: c.description_lt ?? "",
    descriptionEn: c.description_en ?? "",
    specs: parse(carSpecsSchema, c.specs, {}),
    customSpecs: parse(customSpecsSchema, c.custom_specs, []),
    features: parse(featuresSchema, c.features, []),
    priceOverrides: parse(pricingOverrideSchema, c.price_overrides, {}),
    deposit: c.deposit === null ? null : Number(c.deposit),
    rentalRules: parse(rentalRulesOverrideSchema, c.rental_rules, {}),
    status: c.status,
    sort: c.sort,
  };

  return {
    id: c.id,
    publishedAt: c.published_at,
    updatedAt: c.updated_at,
    form,
    images: (images.data ?? []).map((img): EditorImage => ({
      id: img.id,
      path: img.path,
      url: storagePublicUrl("car-images", img.path),
      altLt: img.alt_lt ?? "",
      altEn: img.alt_en ?? "",
      width: img.width,
      height: img.height,
      isCover: img.is_cover,
    })),
    categories: (categories.data ?? []).map((cat): EditorCategory => ({
      id: cat.id,
      name: cat.name_lt,
      pricing: parse(pricingOverrideSchema, cat.default_pricing, {}),
      rules: parse(rentalRulesOverrideSchema, cat.default_rental_rules, {}),
    })),
    makes: (makes.data ?? []).map((m) => m.name),
    models: (models.data ?? []).map((m) => ({
      make: (makes.data ?? []).find((mk) => mk.id === m.make_id)?.name ?? "",
      name: m.name,
      bodyType: m.body_type as BodyType | null,
    })),
    globalPricing: parse<Pricing>(pricingSchema, byKey.get("pricing"), DEFAULT_PRICING),
    globalRules: parse<RentalRules>(rentalRulesSchema, byKey.get("rental_rules"), DEFAULT_RENTAL_RULES),
  };
}

export type CarEditorData = NonNullable<Awaited<ReturnType<typeof getCarEditor>>>;
