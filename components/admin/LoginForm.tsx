"use client";

import { Loader2 } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { signIn, type SignInState } from "@/lib/admin/session-actions";
import { adminInput, adminLabel } from "./ui";

const ERRORS: Record<NonNullable<SignInState>["error"], string> = {
  credentials: "Neteisingas el. paštas arba slaptažodis.",
  rate_limited: "Per daug bandymų. Palaukite kelias minutes ir bandykite dar kartą.",
  unavailable: "Prisijungimas laikinai neveikia.",
  invalid: "Įveskite el. paštą ir slaptažodį.",
};

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signIn, null);
  // Controlled so a failed attempt keeps the email (React resets uncontrolled fields after an action).
  const [email, setEmail] = useState("");

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <label className="flex flex-col gap-1.5">
        <span className={adminLabel}>El. paštas</span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={adminInput}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={adminLabel}>Slaptažodis</span>
        <input name="password" type="password" autoComplete="current-password" required className={adminInput} />
      </label>
      {state?.error && (
        <p role="alert" className="rounded-xl border border-busy/35 bg-busy/10 px-3.5 py-2.5 text-sm">
          {ERRORS[state.error]}
        </p>
      )}
      <Button type="submit" disabled={pending} className="mt-1 w-full">
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        Prisijungti
      </Button>
    </form>
  );
}
