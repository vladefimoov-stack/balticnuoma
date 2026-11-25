import { z } from "zod";
import {
  BODY_TYPES,
  CAR_STATUSES,
  carSpecsSchema,
  customSpecSchema,
  featureSchema,
  pricingOverrideSchema,
  rentalRulesOverrideSchema,
} from "@/lib/db/json";
import { SLUG_PATTERN } from "@/lib/utils/slug";

/**
 * The car editor's form (client state ↔ server action). Drafts may be incomplete;
 * what the database requires (title, category, valid slug) is always enforced.
 */
export const carFormSchema = z.object({
  categoryId: z.uuid({ error: "Pasirinkite kategoriją." }),
  make: z.string().trim().max(60, { error: "Markė per ilga." }),
  model: z.string().trim().max(80, { error: "Modelis per ilgas." }),
  year: z.number().int().min(1950, { error: "Neteisingi metai." }).max(2100, { error: "Neteisingi metai." }).nullable(),
  bodyType: z.enum(BODY_TYPES).nullable(),
  titleLt: z.string().trim().min(1, { error: "Įveskite pavadinimą." }).max(120, { error: "Pavadinimas per ilgas." }),
  titleEn: z.string().trim().max(120, { error: "Pavadinimas per ilgas." }),
  slug: z
    .string()
    .trim()
    .max(120, { error: "Adresas per ilgas." })
    .regex(SLUG_PATTERN, { error: "Adresas: tik mažosios raidės be lietuviškų ženklų, skaičiai ir brūkšneliai." }),
  plate: z.string().trim().max(16, { error: "Valstybinis numeris per ilgas." }),
  color: z.union([z.string().regex(/^#[0-9a-fA-F]{6}$/), z.literal("")]),
  descriptionLt: z.string().max(20000, { error: "Aprašymas per ilgas." }),
  descriptionEn: z.string().max(20000, { error: "Aprašymas per ilgas." }),
  specs: carSpecsSchema,
  customSpecs: z.array(customSpecSchema).max(40),
  features: z.array(featureSchema).max(60),
  priceOverrides: pricingOverrideSchema,
  deposit: z.number().nonnegative().max(1_000_000).nullable(),
  rentalRules: rentalRulesOverrideSchema,
  status: z.enum(CAR_STATUSES),
  sort: z.number().int().min(-10000).max(10000),
});

export type CarForm = z.infer<typeof carFormSchema>;
