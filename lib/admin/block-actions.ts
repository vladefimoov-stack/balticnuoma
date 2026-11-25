"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addDaysIso, isIsoDate, vilniusDayStart } from "@/lib/dates";
import { rangeLiteral } from "@/lib/db/range";
import { PERIOD_UNAVAILABLE_SQLSTATE } from "@/lib/supabase/types";
import { requireStaff } from "./auth";
import type { ActionResult } from "./booking-actions";

const blockSchema = z
  .object({
    carId: z.uuid({ error: "Pasirinkite automobilį." }),
    from: z.string().refine(isIsoDate, { error: "Pasirinkite pradžios datą." }),
    to: z.string().refine(isIsoDate, { error: "Pasirinkite pabaigos datą." }),
    reason: z.string().trim().max(500),
  })
  .refine((v) => v.to >= v.from, { error: "Pabaiga negali būti ankstesnė už pradžią." })
  .refine((v) => addDaysIso(v.from, 366) >= v.to, { error: "Blokuoti galima ne ilgiau kaip metams." });

/** Manual block (maintenance, repair, owner use): whole days, last day inclusive. */
export async function createBlock(input: {
  carId: string;
  from: string;
  to: string;
  reason: string;
}): Promise<ActionResult> {
  const parsed = blockSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const staff = await requireStaff();
  const { carId, from, to, reason } = parsed.data;

  const { error } = await staff.supabase.from("blocks").insert({
    car_id: carId,
    period: rangeLiteral(vilniusDayStart(from), vilniusDayStart(addDaysIso(to, 1))),
    reason: reason || null,
  });
  if (error) {
    if (error.code === PERIOD_UNAVAILABLE_SQLSTATE) {
      return { ok: false, error: "Šiomis datomis jau yra patvirtinta rezervacija arba kitas blokavimas." };
    }
    console.error("[admin] block failed:", error);
    return { ok: false, error: "Nepavyko užblokuoti datų." };
  }
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Datos užblokuotos. Svetainėje jos rodomos kaip užimtos." };
}

export async function deleteBlock(blockId: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(blockId).success) return { ok: false, error: "Neteisingas ID." };
  const staff = await requireStaff();
  const { error } = await staff.supabase.from("blocks").delete().eq("id", blockId);
  if (error) {
    console.error("[admin] unblock failed:", error);
    return { ok: false, error: "Nepavyko pašalinti blokavimo." };
  }
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Blokavimas pašalintas, datos vėl laisvos." };
}
