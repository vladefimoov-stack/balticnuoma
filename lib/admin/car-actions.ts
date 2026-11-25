"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { cleanHtml, isBlankHtml } from "@/lib/content/html";
import { CACHE_TAGS } from "@/lib/data/cache";
import { DEFAULT_PRICING, DEFAULT_RENTAL_RULES } from "@/lib/data/defaults";
import { pricingSchema, rentalRulesSchema, resolveCarTerms } from "@/lib/db/json";
import { availableModes } from "@/lib/pricing/calculate";
import { slugify } from "@/lib/utils/slug";
import { requireAdmin, requireStaff, type Staff } from "./auth";
import type { ActionResult } from "./booking-actions";
import { carFormSchema, type CarForm } from "./car-schema";

type Db = Staff["supabase"];
const id = z.uuid();
const BUCKET = "car-images";

function refreshPublic(carId?: string) {
  revalidateTag(CACHE_TAGS.cars);
  revalidatePath("/admin/automobiliai");
  if (carId) revalidatePath(`/admin/automobiliai/${carId}`);
}

/* ── Make / model directory (autocomplete + free input) ──────────────────── */

const escapeLike = (s: string) => s.replace(/[%_\\]/g, (c) => `\\${c}`);

async function resolveMake(db: Db, name: string) {
  if (!name) return null;
  const found = await db.from("makes").select("id").ilike("name", escapeLike(name)).maybeSingle();
  if (found.data) return found.data.id;
  const created = await db
    .from("makes")
    .insert({ name, slug: slugify(name) || "marke" })
    .select("id")
    .single();
  if (created.data) return created.data.id;
  // Same slug with different spelling ("Mercedes Benz" vs "Mercedes-Benz") → reuse it.
  const bySlug = await db.from("makes").select("id").eq("slug", slugify(name)).maybeSingle();
  if (bySlug.data) return bySlug.data.id;
  throw created.error;
}

async function resolveModel(db: Db, makeId: string | null, name: string, bodyType: CarForm["bodyType"]) {
  if (!makeId || !name) return null;
  const found = await db
    .from("vehicle_models")
    .select("id")
    .eq("make_id", makeId)
    .ilike("name", escapeLike(name))
    .maybeSingle();
  if (found.data) return found.data.id;
  const created = await db
    .from("vehicle_models")
    .insert({ make_id: makeId, name, slug: slugify(name) || "modelis", body_type: bodyType })
    .select("id")
    .single();
  if (created.data) return created.data.id;
  const bySlug = await db
    .from("vehicle_models")
    .select("id")
    .eq("make_id", makeId)
    .eq("slug", slugify(name))
    .maybeSingle();
  if (bySlug.data) return bySlug.data.id;
  throw created.error;
}

/* ── Create / save / duplicate / delete ──────────────────────────────────── */

async function uniqueSlug(db: Db, base: string) {
  const root = slugify(base) || "automobilis";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const { data } = await db.from("cars").select("id").eq("slug", candidate).maybeSingle();
    if (!data) return candidate;
  }
  return `${root}-${crypto.randomUUID().slice(0, 6)}`;
}

/** "Pridėti automobilį": a draft is created right away, so every change can be autosaved. */
export async function createDraftCar() {
  const staff = await requireStaff();
  const { data: category } = await staff.supabase.from("categories").select("id").order("sort").limit(1).maybeSingle();
  if (!category) redirect("/admin/kategorijos?klaida=nera-kategoriju");
  const { data, error } = await staff.supabase
    .from("cars")
    .insert({
      category_id: category.id,
      title_lt: "Naujas automobilis",
      slug: await uniqueSlug(staff.supabase, "naujas-automobilis"),
      status: "draft",
    })
    .select("id")
    .single();
  if (error) throw error;
  revalidatePath("/admin/automobiliai");
  redirect(`/admin/automobiliai/${data.id}`);
}

/** Messages for nested fields, where zod's own (English) messages would leak through. */
const FIELD_ERRORS: Record<string, string> = {
  specs: "Patikrinkite techninius duomenis — viena reikšmė netinkama.",
  customSpecs: "Patikrinkite papildomus duomenis.",
  features: "Patikrinkite įrangos sąrašą.",
  priceOverrides: "Patikrinkite kainas (tik teigiami skaičiai).",
  deposit: "Patikrinkite užstatą.",
  rentalRules: "Patikrinkite reikalavimus vairuotojui (amžius 18–99, stažas 0–60).",
  color: "Spalva turi būti formato #RRGGBB.",
  bodyType: "Pasirinkite kėbulo tipą.",
  status: "Neteisinga būsena.",
  sort: "Neteisingas eilės numeris.",
};

export type SaveCarResult = { ok: true; savedAt: string } | { ok: false; error: string; field?: string };

export async function saveCar(carId: string, input: CarForm): Promise<SaveCarResult> {
  if (!id.safeParse(carId).success) return { ok: false, error: "Neteisingas ID." };
  const parsed = carFormSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = String(issue.path[0] ?? "");
    return { ok: false, error: FIELD_ERRORS[field] ?? issue.message, field };
  }
  const form = parsed.data;
  const staff = await requireStaff();
  const db = staff.supabase;

  const current = await db.from("cars").select("status, published_at").eq("id", carId).maybeSingle();
  if (!current.data) return { ok: false, error: "Automobilis nerastas." };

  // Publishing needs at least one bookable tariff after category / global inheritance.
  if (form.status === "published") {
    const [category, settings] = await Promise.all([
      db.from("categories").select("default_pricing, default_rental_rules").eq("id", form.categoryId).maybeSingle(),
      db.from("settings").select("key, value").in("key", ["pricing", "rental_rules"]),
    ]);
    const byKey = new Map((settings.data ?? []).map((s) => [s.key, s.value]));
    const gp = pricingSchema.safeParse(byKey.get("pricing"));
    const gr = rentalRulesSchema.safeParse(byKey.get("rental_rules"));
    const terms = resolveCarTerms({
      globalPricing: gp.success ? gp.data : DEFAULT_PRICING,
      globalRules: gr.success ? gr.data : DEFAULT_RENTAL_RULES,
      categoryPricing: category.data?.default_pricing,
      categoryRules: category.data?.default_rental_rules,
      carPricing: form.priceOverrides,
      carRules: form.rentalRules,
      carDeposit: form.deposit,
    });
    const modes = availableModes(terms.pricing, terms.rules);
    if (!modes.days && !modes.hourly) {
      return { ok: false, error: "Paskelbti negalima: neįjungtas nė vienas tarifas.", field: "priceOverrides" };
    }
  }

  let makeId: string | null;
  let modelId: string | null;
  try {
    makeId = await resolveMake(db, form.make);
    modelId = await resolveModel(db, makeId, form.model, form.bodyType);
  } catch (error) {
    console.error("[admin] make/model failed:", error);
    return { ok: false, error: "Nepavyko išsaugoti markės / modelio.", field: "make" };
  }

  const description = (html: string) => {
    const clean = cleanHtml(html);
    return clean && !isBlankHtml(clean) ? clean : null;
  };

  const { error } = await db
    .from("cars")
    .update({
      category_id: form.categoryId,
      make_id: makeId,
      vehicle_model_id: modelId,
      year: form.year,
      body_type: form.bodyType,
      title_lt: form.titleLt,
      title_en: form.titleEn || null,
      slug: form.slug,
      plate: form.plate || null,
      color: form.color || null,
      description_lt: description(form.descriptionLt),
      description_en: description(form.descriptionEn),
      specs: form.specs,
      custom_specs: form.customSpecs,
      features: form.features,
      price_overrides: form.priceOverrides,
      deposit: form.deposit,
      rental_rules: form.rentalRules,
      status: form.status,
      sort: form.sort,
      published_at:
        form.status === "published" && !current.data.published_at
          ? new Date().toISOString()
          : current.data.published_at,
    })
    .eq("id", carId);

  if (error) {
    if (error.code === "23505")
      return { ok: false, error: "Toks adresas jau naudojamas kitam automobiliui.", field: "slug" };
    if (error.code === "23514" && error.message.includes("cars_archived_not_published")) {
      return {
        ok: false,
        error: "Ištrintas automobilis negali būti paskelbtas — pirmiausia jį atkurkite.",
        field: "status",
      };
    }
    console.error("[admin] save car failed:", error);
    return { ok: false, error: "Nepavyko išsaugoti. Bandykite dar kartą." };
  }
  refreshPublic(carId);
  return { ok: true, savedAt: new Date().toISOString() };
}

/** Copy a car (e.g. the 5th identical Prius): same data and photos, new slug, saved as a draft. */
export async function duplicateCar(carId: string) {
  if (!id.safeParse(carId).success) return;
  const staff = await requireStaff();
  const db = staff.supabase;
  const { data: car } = await db.from("cars").select("*").eq("id", carId).maybeSingle();
  if (!car) return;

  const title = `${car.title_lt} (kopija)`.slice(0, 120);
  const {
    id: _id,
    created_at: _c,
    updated_at: _u,
    published_at: _p,
    created_by: _b,
    active_model_version_id: _a,
    ...rest
  } = car;
  const { data: copy, error } = await db
    .from("cars")
    .insert({
      ...rest,
      ...("archived_at" in rest ? { archived_at: null } : {}),
      title_lt: title,
      slug: await uniqueSlug(db, car.slug),
      status: "draft",
      plate: null,
    })
    .select("id")
    .single();
  if (error) throw error;

  const { data: images } = await db.from("car_images").select("*").eq("car_id", carId).order("sort");
  for (const img of images ?? []) {
    const path = `cars/${copy.id}/${crypto.randomUUID()}.${img.path.split(".").pop() ?? "webp"}`;
    const copied = await db.storage.from(BUCKET).copy(img.path, path);
    if (copied.error) {
      console.error("[admin] photo copy failed:", copied.error);
      continue;
    }
    await db.from("car_images").insert({
      car_id: copy.id,
      path,
      alt_lt: img.alt_lt,
      alt_en: img.alt_en,
      width: img.width,
      height: img.height,
      blur_data_url: img.blur_data_url,
      sort: img.sort,
      is_cover: img.is_cover,
    });
  }
  refreshPublic();
  redirect(`/admin/automobiliai/${copy.id}`);
}

const MIGRATION_MISSING =
  "Duomenų bazėje trūksta migracijos 20261125160000_car_archive.sql — paleiskite ją (docs/SUPABASE_SETUP.md).";

/**
 * Admin only. A car without bookings is deleted with its photos. A car with booking
 * history is archived instead (hidden everywhere, old bookings keep showing it).
 * Cars with upcoming bookings / requests can't be deleted until those are handled.
 */
export async function deleteCar(carId: string): Promise<ActionResult> {
  if (!id.safeParse(carId).success) return { ok: false, error: "Neteisingas ID." };
  const staff = await requireAdmin();
  const db = staff.supabase;

  const upcoming = await db
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("car_id", carId)
    .in("status", ["pending", "confirmed"])
    .overlaps("period", `[${new Date().toISOString()},2200-01-01T00:00:00Z)`);
  if ((upcoming.count ?? 0) > 0) {
    return {
      ok: false,
      error: `Automobilis turi būsimų rezervacijų ar užklausų (${upcoming.count}). Pirmiausia jas atšaukite arba atmeskite (Rezervacijos → filtras pagal automobilį).`,
    };
  }

  const { count: history } = await db.from("bookings").select("id", { count: "exact", head: true }).eq("car_id", carId);
  if ((history ?? 0) > 0) {
    const { error } = await db
      .from("cars")
      .update({ archived_at: new Date().toISOString(), status: "hidden" })
      .eq("id", carId);
    if (error) {
      if (error.code === "PGRST204" || error.code === "42703") return { ok: false, error: MIGRATION_MISSING };
      console.error("[admin] archive car failed:", error);
      return { ok: false, error: "Nepavyko ištrinti automobilio." };
    }
    refreshPublic(carId);
    redirect("/admin/automobiliai?archyvuota=1");
  }

  const { data: images } = await db.from("car_images").select("path").eq("car_id", carId);
  const { error } = await db.from("cars").delete().eq("id", carId);
  if (error) {
    console.error("[admin] delete car failed:", error);
    return { ok: false, error: "Nepavyko ištrinti automobilio." };
  }
  if (images?.length) await db.storage.from(BUCKET).remove(images.map((i) => i.path));
  refreshPublic();
  redirect("/admin/automobiliai?istrinta=1");
}

/** Admin only: bring an archived car back (as hidden — publish it in the editor when ready). */
export async function restoreCar(carId: string): Promise<ActionResult> {
  if (!id.safeParse(carId).success) return { ok: false, error: "Neteisingas ID." };
  const staff = await requireAdmin();
  const { error } = await staff.supabase.from("cars").update({ archived_at: null }).eq("id", carId);
  if (error) {
    if (error.code === "PGRST204" || error.code === "42703") return { ok: false, error: MIGRATION_MISSING };
    return { ok: false, error: "Nepavyko atkurti automobilio." };
  }
  refreshPublic(carId);
  redirect(`/admin/automobiliai/${carId}?zingsnis=kainos`);
}

/* ── Photos (files are uploaded from the browser straight to Storage) ────── */

const imageSchema = z.object({
  path: z.string().regex(/^cars\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(webp|jpg|png)$/),
  width: z.number().int().positive().max(20000),
  height: z.number().int().positive().max(20000),
  blurDataUrl: z.string().max(2000).startsWith("data:image/").nullable(),
});

export async function registerImage(carId: string, input: z.infer<typeof imageSchema>): Promise<ActionResult> {
  const parsed = imageSchema.safeParse(input);
  if (!id.safeParse(carId).success || !parsed.success || !parsed.data.path.startsWith(`cars/${carId}/`)) {
    return { ok: false, error: "Neteisingi nuotraukos duomenys." };
  }
  const staff = await requireStaff();
  const { data: existing } = await staff.supabase.from("car_images").select("sort, is_cover").eq("car_id", carId);
  const { error } = await staff.supabase.from("car_images").insert({
    car_id: carId,
    path: parsed.data.path,
    width: parsed.data.width,
    height: parsed.data.height,
    blur_data_url: parsed.data.blurDataUrl,
    sort: Math.max(-1, ...(existing ?? []).map((i) => i.sort)) + 1,
    is_cover: !(existing ?? []).some((i) => i.is_cover),
  });
  if (error) {
    console.error("[admin] register photo failed:", error);
    await staff.supabase.storage.from(BUCKET).remove([parsed.data.path]);
    return { ok: false, error: "Nepavyko išsaugoti nuotraukos." };
  }
  refreshPublic(carId);
  return { ok: true, message: "Nuotrauka įkelta." };
}

export async function updateImageAlt(imageId: string, altLt: string, altEn: string): Promise<ActionResult> {
  if (!id.safeParse(imageId).success) return { ok: false, error: "Neteisingas ID." };
  const staff = await requireStaff();
  const { data, error } = await staff.supabase
    .from("car_images")
    .update({ alt_lt: altLt.trim().slice(0, 200) || null, alt_en: altEn.trim().slice(0, 200) || null })
    .eq("id", imageId)
    .select("car_id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Nepavyko išsaugoti aprašymo." };
  refreshPublic(data.car_id);
  return { ok: true, message: "Išsaugota." };
}

export async function setCoverImage(carId: string, imageId: string): Promise<ActionResult> {
  if (!id.safeParse(carId).success || !id.safeParse(imageId).success) return { ok: false, error: "Neteisingas ID." };
  const staff = await requireStaff();
  // One cover per car (unique index): clear first, then set.
  await staff.supabase.from("car_images").update({ is_cover: false }).eq("car_id", carId).eq("is_cover", true);
  const { error } = await staff.supabase
    .from("car_images")
    .update({ is_cover: true })
    .eq("id", imageId)
    .eq("car_id", carId);
  if (error) return { ok: false, error: "Nepavyko pakeisti viršelio." };
  refreshPublic(carId);
  return { ok: true, message: "Viršelis pakeistas." };
}

export async function reorderImages(carId: string, imageIds: string[]): Promise<ActionResult> {
  if (!id.safeParse(carId).success || !z.array(z.uuid()).max(100).safeParse(imageIds).success) {
    return { ok: false, error: "Neteisingi duomenys." };
  }
  const staff = await requireStaff();
  const results = await Promise.all(
    imageIds.map((imageId, sort) =>
      staff.supabase.from("car_images").update({ sort }).eq("id", imageId).eq("car_id", carId),
    ),
  );
  if (results.some((r) => r.error)) return { ok: false, error: "Nepavyko išsaugoti eilės." };
  refreshPublic(carId);
  return { ok: true, message: "Eilė išsaugota." };
}

export async function deleteImage(imageId: string): Promise<ActionResult> {
  if (!id.safeParse(imageId).success) return { ok: false, error: "Neteisingas ID." };
  const staff = await requireStaff();
  const db = staff.supabase;
  const { data: img } = await db.from("car_images").select("car_id, path, is_cover").eq("id", imageId).maybeSingle();
  if (!img) return { ok: false, error: "Nuotrauka nerasta." };
  const { error } = await db.from("car_images").delete().eq("id", imageId);
  if (error) return { ok: false, error: "Nepavyko ištrinti nuotraukos." };
  await db.storage.from(BUCKET).remove([img.path]);
  if (img.is_cover) {
    const { data: next } = await db
      .from("car_images")
      .select("id")
      .eq("car_id", img.car_id)
      .order("sort")
      .limit(1)
      .maybeSingle();
    if (next) await db.from("car_images").update({ is_cover: true }).eq("id", next.id);
  }
  refreshPublic(img.car_id);
  return { ok: true, message: "Nuotrauka ištrinta." };
}
