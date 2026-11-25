import { z } from "zod";
import { isPlausiblePhone, selectionSchema } from "@/lib/booking/schema";

/**
 * A booking entered by staff (phone / ad callers). Only name and phone are required;
 * email, licence year and comments are optional. Errors are Lithuanian (admin is LT-only).
 */
export const manualBookingSchema = z.object({
  carId: z.uuid({ error: "Pasirinkite automobilį." }),
  selection: selectionSchema,
  firstName: z.string().trim().min(1, { error: "Įveskite vardą." }).max(80, { error: "Vardas per ilgas." }),
  lastName: z.string().trim().min(1, { error: "Įveskite pavardę." }).max(80, { error: "Pavardė per ilga." }),
  phone: z
    .string()
    .trim()
    .min(1, { error: "Įveskite telefono numerį." })
    .max(32, { error: "Telefono numeris per ilgas." })
    .refine(isPlausiblePhone, { error: "Neteisingas telefono numeris." }),
  email: z
    .string()
    .trim()
    .max(254, { error: "El. paštas per ilgas." })
    .refine((v) => v === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), { error: "Neteisingas el. pašto adresas." }),
  licenseYear: z
    .number()
    .int()
    .min(1940, { error: "Neteisingi pažymėjimo metai." })
    .refine((y) => y <= new Date().getFullYear(), { error: "Neteisingi pažymėjimo metai." })
    .nullable(),
  locale: z.enum(["lt", "en"]),
  comment: z.string().trim().max(1000, { error: "Komentaras per ilgas." }),
  managerNote: z.string().trim().max(2000, { error: "Pastaba per ilga." }),
  status: z.enum(["confirmed", "pending"]),
  /** null = price from the tariffs. */
  total: z.number().nonnegative({ error: "Kaina negali būti neigiama." }).max(1_000_000).nullable(),
  /** null = the car's deposit. */
  deposit: z.number().nonnegative({ error: "Užstatas negali būti neigiamas." }).max(1_000_000).nullable(),
  sendEmail: z.boolean(),
});

export type ManualBookingInput = z.infer<typeof manualBookingSchema>;
