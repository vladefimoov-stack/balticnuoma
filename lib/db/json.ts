import { z } from "zod";

/**
 * Contracts for the JSONB columns of the database. Postgres only checks that they
 * are objects/arrays — the shape is validated here, at every read/write boundary.
 */

// ── Shared enums ─────────────────────────────────────────────────────────────
export const RENTAL_TYPES = ["hourly", "daily", "weekly", "long_term"] as const;
export const FUEL_TYPES = ["petrol", "diesel", "hybrid", "plug_in_hybrid", "electric", "lpg"] as const;
export const TRANSMISSIONS = ["automatic", "manual"] as const;
export const DRIVES = ["fwd", "rwd", "awd"] as const;
export const MODEL_ANGLES = ["front", "side", "back", "three_quarter"] as const;
export const BODY_TYPES = ["sedan", "hatchback", "wagon", "suv", "coupe", "cabrio", "minivan", "van"] as const;
export const CAR_STATUSES = ["draft", "published", "hidden", "maintenance"] as const;
export const THREE_D_PROVIDERS = ["meshy", "tripo", "mock"] as const;

const money = z.number().nonnegative().max(1_000_000);

// ── Pricing: settings.pricing ← categories.default_pricing ← cars.price_overrides
export const pricingSchema = z.object({
  currency: z.literal("EUR").default("EUR"),
  hourly: z.object({ enabled: z.boolean(), price: money, min_hours: z.number().int().min(1).max(24) }),
  daily: z.object({ enabled: z.boolean(), price: money }),
  weekly: z.object({ enabled: z.boolean(), price: money }),
  long_term: z.object({ enabled: z.boolean(), price_per_week: money, min_weeks: z.number().int().min(2).max(104) }),
  deposit: money,
});
export type Pricing = z.infer<typeof pricingSchema>;

export const pricingOverrideSchema = z.object({
  hourly: pricingSchema.shape.hourly.partial().optional(),
  daily: pricingSchema.shape.daily.partial().optional(),
  weekly: pricingSchema.shape.weekly.partial().optional(),
  long_term: pricingSchema.shape.long_term.partial().optional(),
  deposit: money.optional(),
});
export type PricingOverride = z.infer<typeof pricingOverrideSchema>;

/** Apply partial overrides (category, then car) on top of the global tariffs. */
export function resolvePricing(base: Pricing, ...overrides: Array<PricingOverride | null | undefined>): Pricing {
  return overrides.reduce<Pricing>((acc, o) => {
    if (!o) return acc;
    return {
      ...acc,
      hourly: { ...acc.hourly, ...o.hourly },
      daily: { ...acc.daily, ...o.daily },
      weekly: { ...acc.weekly, ...o.weekly },
      long_term: { ...acc.long_term, ...o.long_term },
      deposit: o.deposit ?? acc.deposit,
    };
  }, base);
}

// ── Rental rules: settings.rental_rules ← categories.default_rental_rules ← cars.rental_rules
const rulesShape = {
  min_age: z.number().int().min(18).max(99),
  min_license_years: z.number().int().min(0).max(60),
  min_rental_days: z.number().int().min(1).max(365).nullable(),
  mileage_limit_km_per_day: z.number().int().min(1).max(5000).nullable(),
  allowed_rental_types: z.array(z.enum(RENTAL_TYPES)).min(1),
};

export const rentalRulesSchema = z.object({
  ...rulesShape,
  min_rental_days: rulesShape.min_rental_days.default(null),
  mileage_limit_km_per_day: rulesShape.mileage_limit_km_per_day.default(null),
  /** Omitted = every tariff enabled in pricing is allowed. */
  allowed_rental_types: rulesShape.allowed_rental_types.optional(),
});
export type RentalRules = z.infer<typeof rentalRulesSchema>;

/**
 * Category / car overrides: every key optional and WITHOUT defaults — a missing key
 * means "inherit". (`rentalRulesSchema.partial()` would keep the `null` defaults and an
 * empty override would wipe e.g. the category's mileage limit.)
 */
export const rentalRulesOverrideSchema = z.object(rulesShape).partial();
export type RentalRulesOverride = z.infer<typeof rentalRulesOverrideSchema>;

export function resolveRentalRules(
  base: RentalRules,
  ...overrides: Array<RentalRulesOverride | null | undefined>
): RentalRules {
  return overrides.reduce<RentalRules>((acc, o) => (o ? { ...acc, ...stripUndefined(o) } : acc), base);
}

/**
 * Effective tariffs, rules and deposit of one car from the raw JSONB columns:
 * global settings ← category defaults ← car overrides. Invalid overrides are ignored.
 */
export function resolveCarTerms(input: {
  globalPricing: Pricing;
  globalRules: RentalRules;
  categoryPricing: unknown;
  categoryRules: unknown;
  carPricing: unknown;
  carRules: unknown;
  carDeposit: number | null;
}) {
  const parsed = <T>(schema: z.ZodType<T>, value: unknown) => {
    const result = schema.safeParse(value);
    return result.success ? result.data : null;
  };
  const pricing = resolvePricing(
    input.globalPricing,
    parsed(pricingOverrideSchema, input.categoryPricing),
    parsed(pricingOverrideSchema, input.carPricing),
  );
  const rules = resolveRentalRules(
    input.globalRules,
    parsed(rentalRulesOverrideSchema, input.categoryRules),
    parsed(rentalRulesOverrideSchema, input.carRules),
  );
  return { pricing, rules, deposit: input.carDeposit ?? pricing.deposit };
}

// ── Car specs (cars.specs) ───────────────────────────────────────────────────
export const carSpecsSchema = z.object({
  fuel: z.enum(FUEL_TYPES).optional(),
  transmission: z.enum(TRANSMISSIONS).optional(),
  drive: z.enum(DRIVES).optional(),
  engine_l: z.number().positive().max(10).optional(),
  power_hp: z.number().int().positive().max(2000).optional(),
  acceleration_0_100_s: z.number().positive().max(30).optional(),
  seats: z.number().int().min(1).max(9).optional(),
  doors: z.number().int().min(2).max(5).optional(),
  consumption_l_100km: z.number().nonnegative().max(30).optional(),
  consumption_kwh_100km: z.number().nonnegative().max(60).optional(),
  range_km: z.number().int().positive().max(2000).optional(),
  trunk_l: z.number().int().nonnegative().max(5000).optional(),
  /** Livery / branding description (free text), e.g. "Matinė juoda plėvelė". */
  livery: z.string().max(60).optional(),
});
export type CarSpecs = z.infer<typeof carSpecsSchema>;

/** Free "label — value" rows (cars.custom_specs), e.g. "Masažinės sėdynės — Taip". */
export const customSpecSchema = z.object({
  label_lt: z.string().trim().min(1).max(60),
  label_en: z.string().trim().max(60).optional(),
  value_lt: z.string().trim().min(1).max(120),
  value_en: z.string().trim().max(120).optional(),
});
export const customSpecsSchema = z.array(customSpecSchema).max(40);
export type CustomSpec = z.infer<typeof customSpecSchema>;

// ── Equipment (cars.features) ────────────────────────────────────────────────
/** Built-in features → lucide icon name. Labels live in messages/*.json. */
export const KNOWN_FEATURES = {
  climate_control: "snowflake",
  navigation: "navigation",
  heated_seats: "flame",
  ventilated_seats: "fan",
  apple_carplay: "smartphone",
  android_auto: "smartphone",
  bluetooth: "bluetooth",
  usb_charging: "usb",
  panoramic_roof: "sun",
  adaptive_cruise: "gauge",
  parking_camera: "camera",
  parking_sensors: "radar",
  keyless: "key-round",
  leather_seats: "armchair",
  automatic_transmission: "cog",
  hybrid: "leaf",
  child_seat: "baby",
  towbar: "link",
} as const;
export type KnownFeature = keyof typeof KNOWN_FEATURES;

export const featureSchema = z.object({
  key: z.string().regex(/^[a-z0-9_-]{2,40}$/),
  /** Custom features only: icon + labels. Known keys are translated by the app. */
  icon: z.string().max(40).optional(),
  label_lt: z.string().trim().max(60).optional(),
  label_en: z.string().trim().max(60).optional(),
});
export const featuresSchema = z.array(featureSchema).max(60);
export type Feature = z.infer<typeof featureSchema>;

// ── 3D (unused — dropped by the owner; kept to match the existing DB columns) ──
// 3D viewer settings (car_model_versions.view_settings, base_models.camera_json)
const vec3 = z.tuple([z.number(), z.number(), z.number()]);
export const viewSettingsSchema = z.object({
  scale: z.number().positive().max(100).default(1),
  y_offset: z.number().min(-10).max(10).default(0),
  rotation_y: z.number().min(-360).max(360).default(0),
  camera: z.object({ position: vec3, target: vec3, fov: z.number().min(10).max(90) }).optional(),
  env_intensity: z.number().min(0).max(5).default(1),
  initial_view: z.enum(MODEL_ANGLES).default("three_quarter"),
});
export type ViewSettings = z.infer<typeof viewSettingsSchema>;

/** model_jobs.angles */
export const jobAnglesSchema = z
  .array(z.object({ image_id: z.uuid(), angle: z.enum(MODEL_ANGLES), path: z.string().min(1) }))
  .min(1)
  .max(4);

// ── Settings rows ────────────────────────────────────────────────────────────
export const contactsSchema = z.object({
  phone: z.string().min(5).max(32),
  whatsapp_url: z.url().or(z.literal("")),
  telegram_username: z.string().max(64),
  email: z.email().or(z.literal("")),
  address: z.string().max(200),
  /** Missing = closed: the office is temporarily closed (owner, 2026-11); ticked in admin when it reopens. */
  office_open: z.boolean().default(false),
});

export const openingHoursSchema = z.array(
  z.object({
    days: z.array(z.number().int().min(1).max(7)).min(1),
    opens: z.string().regex(/^\d{2}:\d{2}$/),
    closes: z.string().regex(/^\d{2}:\d{2}$/),
  }),
);

export const notificationsSchema = z.object({ booking_email: z.email().nullable() });

/** Legal requisites shown in the footer and the legal pages (empty = not filled in yet). */
export const companySchema = z.object({
  legal_name: z.string().trim().max(120),
  company_code: z.string().trim().max(20),
  vat_code: z.string().trim().max(20),
  registered_address: z.string().trim().max(200),
  privacy_email: z.email().or(z.literal("")),
});
export type Company = z.infer<typeof companySchema>;

export const threeDSettingsSchema = z.object({
  provider: z.enum(THREE_D_PROVIDERS),
  /** Provider model id or alias ("latest"); never hard-coded in code. */
  ai_model: z.string().min(1).max(64),
  fallback_provider: z.enum(THREE_D_PROVIDERS).optional(),
  monthly_limit: z.number().int().min(0).max(1000),
  timeout_minutes: z.number().int().min(5).max(240),
  target_triangles: z.number().int().min(10_000).max(1_000_000),
  max_texture_size: z.number().int().min(256).max(4096),
});

export const settingsSchemas = {
  pricing: pricingSchema,
  rental_rules: rentalRulesSchema,
  contacts: contactsSchema,
  opening_hours: openingHoursSchema,
  notifications: notificationsSchema,
  company: companySchema,
  three_d: threeDSettingsSchema,
} as const;
export type SettingKey = keyof typeof settingsSchemas;
export type SettingValue<K extends SettingKey> = z.infer<(typeof settingsSchemas)[K]>;

export function parseSetting<K extends SettingKey>(key: K, value: unknown): SettingValue<K> {
  return settingsSchemas[key].parse(value) as SettingValue<K>;
}

function stripUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}
