"use client";

import { Check, Loader2, RotateCcw, X } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import {
  cancelBooking,
  confirmBooking,
  rejectBooking,
  rejectOverlappingRequests,
  reopenBooking,
  saveManagerNote,
  type ActionResult,
} from "@/lib/admin/booking-actions";
import type { BookingStatus } from "@/lib/supabase/types";
import { adminInput, adminLabel, Notice } from "./ui";

/** Ready-made reasons in the customer's language (the rejection email is sent in it). */
const QUICK_REASONS = {
  lt: [
    "Deja, pasirinktos datos jau užimtos.",
    "Neatitinkate reikalavimų vairuotojui (amžius / vairavimo stažas).",
    "Nepavyko su jumis susisiekti nurodytu telefonu.",
  ],
  en: [
    "Unfortunately, the selected dates are already booked.",
    "You do not meet the driver requirements (age / driving experience).",
    "We could not reach you at the phone number provided.",
  ],
};

type Props = { id: string; status: BookingStatus; taken: boolean; otherRequests: number; locale: string };

export function BookingActions({ id, status, taken, otherRequests, locale }: Props) {
  const english = locale === "en";
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [mode, setMode] = useState<"idle" | "reject" | "cancel">("idle");
  const [reason, setReason] = useState("");

  const run = (action: () => Promise<ActionResult>) =>
    start(async () => {
      const res = await action();
      setResult(res);
      if (res.ok) {
        setMode("idle");
        setReason("");
      }
    });

  return (
    <div className="flex flex-col gap-3">
      {result && <Notice tone={result.ok ? "success" : "error"}>{result.ok ? result.message : result.error}</Notice>}

      {status === "pending" && mode === "idle" && (
        <>
          {taken && (
            <Notice tone="warning">
              Šios datos jau užimtos patvirtinta rezervacija arba blokavimu — patvirtinti nepavyks.
            </Notice>
          )}
          <Button disabled={pending} onClick={() => run(() => confirmBooking(id))} className="w-full">
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Check className="size-4" aria-hidden />
            )}
            Patvirtinti
          </Button>
          <Button variant="secondary" disabled={pending} onClick={() => setMode("reject")} className="w-full">
            <X className="size-4" aria-hidden />
            Atmesti
          </Button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setMode("cancel")}
            className="self-center text-xs text-muted underline hover:text-fg"
          >
            Atšaukti be laiško
          </button>
        </>
      )}

      {status === "pending" && mode === "reject" && (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={adminLabel}>
              {english
                ? "Priežastis (bus išsiųsta klientui — klientas kalba angliškai, rašykite angliškai)"
                : "Priežastis (bus išsiųsta klientui)"}
            </span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
              className={`${adminInput} h-auto py-2.5`}
              autoFocus
            />
          </label>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_REASONS[english ? "en" : "lt"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className="rounded-pill border border-line px-2.5 py-1 text-left text-xs text-muted transition-colors hover:border-amber/50 hover:text-fg"
              >
                {r}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={pending || reason.trim().length < 3}
              onClick={() => run(() => rejectBooking(id, reason))}
              className="flex-1 hover:border-busy/60 hover:text-busy"
            >
              {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Atmesti užklausą
            </Button>
            <Button variant="ghost" onClick={() => setMode("idle")}>
              Atgal
            </Button>
          </div>
        </div>
      )}

      {status === "confirmed" && mode === "idle" && (
        <>
          {otherRequests > 0 && (
            <Button disabled={pending} onClick={() => run(() => rejectOverlappingRequests(id))} className="w-full">
              Atmesti kitas užklausas šioms datoms ({otherRequests})
            </Button>
          )}
          <Button variant="secondary" disabled={pending} onClick={() => setMode("cancel")} className="w-full">
            Atšaukti rezervaciją
          </Button>
        </>
      )}

      {(status === "confirmed" || status === "pending") && mode === "cancel" && (
        <div className="flex flex-col gap-3">
          <Notice tone="warning">Datos bus atlaisvintos. Klientui laiškas nesiunčiamas — praneškite jam patys.</Notice>
          <label className="flex flex-col gap-1.5">
            <span className={adminLabel}>Priežastis (neprivaloma, matoma tik administravime)</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              maxLength={500}
              className={`${adminInput} h-auto py-2.5`}
            />
          </label>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => run(() => cancelBooking(id, reason))}
              className="flex-1 hover:border-busy/60 hover:text-busy"
            >
              {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Atšaukti
            </Button>
            <Button variant="ghost" onClick={() => setMode("idle")}>
              Atgal
            </Button>
          </div>
        </div>
      )}

      {(status === "rejected" || status === "cancelled") && (
        <Button variant="secondary" disabled={pending} onClick={() => run(() => reopenBooking(id))} className="w-full">
          <RotateCcw className="size-4" aria-hidden />
          Grąžinti į laukiančias
        </Button>
      )}
    </div>
  );
}

export function ManagerNote({ id, initial }: { id: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <textarea
        aria-label="Vadybininko pastaba"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setResult(null);
        }}
        rows={4}
        maxLength={2000}
        placeholder="Pvz.: perdavimas 10:00 biure, sutarta telefonu…"
        className={`${adminInput} h-auto py-2.5`}
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted" role="status">
          {result
            ? result.ok
              ? result.message
              : result.error
            : value !== saved
              ? "Neišsaugota"
              : "Matoma tik administravime"}
        </span>
        <Button
          size="sm"
          variant="secondary"
          disabled={pending || value === saved}
          onClick={() =>
            start(async () => {
              const res = await saveManagerNote(id, value);
              setResult(res);
              if (res.ok) setSaved(value);
            })
          }
        >
          {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
          Išsaugoti
        </Button>
      </div>
    </div>
  );
}
