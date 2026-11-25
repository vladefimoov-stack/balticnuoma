"use client";

import { Loader2, RotateCcw, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/admin/booking-actions";
import { deleteCar, restoreCar } from "@/lib/admin/car-actions";

export const DELETE_CAR_CONFIRM = (title: string) =>
  `Ištrinti „${title}“?\n\nJei automobilis neturėjo rezervacijų — jis ir jo nuotraukos bus ištrinti visam laikui.\nJei turėjo — jis dings iš svetainės ir sąrašų, o rezervacijų istorija išliks (atkurti galima skiltyje „Ištrinti automobiliai“).`;

/** Admin-only delete (server decides: hard delete or archive; refuses with upcoming bookings). */
export function DeleteCarButton({
  carId,
  title,
  compact = false,
}: {
  carId: string;
  title: string;
  compact?: boolean;
}) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  return (
    <div className={compact ? "relative" : "flex flex-col gap-2"}>
      <Button
        type="button"
        size="sm"
        variant={compact ? "ghost" : "secondary"}
        disabled={pending}
        aria-label={`Ištrinti ${title}`}
        title="Ištrinti"
        className={compact ? "px-2.5 hover:text-busy" : "hover:border-busy/60 hover:text-busy"}
        onClick={() => {
          if (!window.confirm(DELETE_CAR_CONFIRM(title))) return;
          start(async () => {
            const res = await deleteCar(carId);
            // Success redirects; only errors come back.
            if (res && !res.ok) setResult(res);
          });
        }}
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : (
          <Trash2 className="size-3.5" aria-hidden />
        )}
        {!compact && "Ištrinti"}
      </Button>
      {result && !result.ok && (
        <p
          role="alert"
          className={
            compact
              ? "absolute top-full right-0 z-10 mt-2 w-72 max-w-[80vw] rounded-lg border border-busy/40 bg-surface-2 px-3 py-2 text-xs shadow-card"
              : "rounded-lg border border-busy/35 bg-busy/10 px-3 py-2 text-xs"
          }
        >
          {result.error}
        </p>
      )}
    </div>
  );
}

export function RestoreCarButton({ carId }: { carId: string }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await restoreCar(carId);
            if (res && !res.ok) setResult(res);
          })
        }
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : (
          <RotateCcw className="size-3.5" aria-hidden />
        )}
        Atkurti
      </Button>
      {result && !result.ok && (
        <p role="alert" className="rounded-lg border border-busy/35 bg-busy/10 px-3 py-2 text-xs">
          {result.error}
        </p>
      )}
    </div>
  );
}
