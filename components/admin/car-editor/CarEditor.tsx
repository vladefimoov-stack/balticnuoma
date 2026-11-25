"use client";

import { AlertCircle, ArrowLeft, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { saveCar } from "@/lib/admin/car-actions";
import type { CarForm } from "@/lib/admin/car-schema";
import type { CarEditorData } from "@/lib/admin/cars";
import { cn } from "@/lib/utils/cn";
import { RestoreCarButton } from "../CarRowActions";
import { CarStatusBadge } from "../ui";
import { BasicStep, type EditorLabels } from "./BasicStep";
import { PhotosStep } from "./PhotosStep";
import { PublishStep } from "./PublishStep";

const STEPS = [
  { id: "pagrindine", label: "Pagrindinė informacija" },
  { id: "nuotraukos", label: "Nuotraukos" },
  { id: "kainos", label: "Kainos ir paskelbimas" },
] as const;
type StepId = (typeof STEPS)[number]["id"];

type SaveState =
  | { state: "idle" }
  | { state: "saving" }
  | { state: "saved"; at: string }
  | { state: "error"; error: string; field: string | null };

const AUTOSAVE_MS = 1200;

/** Drop half-typed rows the database would reject; they stay in the form until completed. */
function toSavable(form: CarForm): CarForm {
  return {
    ...form,
    customSpecs: form.customSpecs
      .filter((r) => r.label_lt.trim() && r.value_lt.trim())
      .map((r) => ({
        label_lt: r.label_lt.trim(),
        value_lt: r.value_lt.trim(),
        ...(r.label_en?.trim() ? { label_en: r.label_en.trim() } : {}),
        ...(r.value_en?.trim() ? { value_en: r.value_en.trim() } : {}),
      })),
    features: form.features.filter((f) => !f.key.startsWith("custom-") || f.label_lt?.trim()),
  };
}

export function CarEditor({
  data,
  labels,
  isAdmin,
  initialStep,
}: {
  data: CarEditorData;
  labels: EditorLabels;
  isAdmin: boolean;
  initialStep: StepId;
}) {
  const [form, setForm] = useState<CarForm>(data.form);
  const [step, setStep] = useState<StepId>(initialStep);
  const [save, setSave] = useState<SaveState>({ state: "idle" });
  const latest = useRef(form);
  const savedJson = useRef(JSON.stringify(toSavable(data.form)));
  const running = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /** Save the latest form; if it changed while saving, save again (never two saves at once). */
  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    if (running.current) return;
    const payload = toSavable(latest.current);
    const json = JSON.stringify(payload);
    if (json === savedJson.current) return;
    running.current = true;
    setSave({ state: "saving" });
    try {
      const res = await saveCar(data.id, payload);
      if (res.ok) {
        savedJson.current = json;
        setSave({ state: "saved", at: res.savedAt });
      } else {
        setSave({ state: "error", error: res.error, field: res.field ?? null });
      }
    } catch {
      setSave({ state: "error", error: "Nepavyko išsaugoti — patikrinkite ryšį.", field: null });
    } finally {
      running.current = false;
    }
    if (JSON.stringify(toSavable(latest.current)) !== savedJson.current) {
      timer.current = setTimeout(() => void flush(), AUTOSAVE_MS);
    }
  }, [data.id]);

  const set = useCallback(
    (patch: Partial<CarForm>) => {
      setForm((prev) => {
        const next = { ...prev, ...patch };
        latest.current = next;
        return next;
      });
      clearTimeout(timer.current);
      // Status changes (publish / hide) are saved at once, everything else after a short pause.
      timer.current = setTimeout(() => void flush(), "status" in patch ? 0 : AUTOSAVE_MS);
    },
    [flush],
  );

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (JSON.stringify(toSavable(latest.current)) !== savedJson.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  function goTo(next: StepId) {
    void flush();
    setStep(next);
    const url = new URL(window.location.href);
    url.searchParams.set("zingsnis", next);
    window.history.replaceState(window.history.state, "", url);
    window.scrollTo({ top: 0 });
  }

  const errorField = save.state === "error" ? save.field : null;
  const stepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <>
      <header className="mb-5 flex flex-col gap-3">
        <Link
          href="/admin/automobiliai"
          className="inline-flex items-center gap-1.5 self-start text-sm text-muted hover:text-fg"
        >
          <ArrowLeft className="size-4" aria-hidden /> Automobiliai
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h1 className="truncate font-display text-2xl font-semibold tracking-tight">
              {form.titleLt || "Be pavadinimo"}
            </h1>
            <CarStatusBadge status={form.status} />
          </div>
          <SaveIndicator save={save} onRetry={() => void flush()} />
        </div>
        {data.archived && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-pending/35 bg-pending/10 px-3.5 py-2.5 text-sm">
            <span>Šis automobilis ištrintas (saugomas rezervacijų istorijai). Svetainėje jis nerodomas.</span>
            {isAdmin && <RestoreCarButton carId={data.id} />}
          </div>
        )}
        {save.state === "error" && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-busy/35 bg-busy/10 px-3.5 py-2.5 text-sm"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-busy" aria-hidden />
            {save.error}
          </p>
        )}
      </header>

      <nav
        aria-label="Žingsniai"
        className="mb-6 grid grid-cols-3 gap-1 rounded-card border border-line bg-surface p-1"
      >
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => goTo(s.id)}
            aria-current={step === s.id ? "step" : undefined}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-xs font-medium transition-colors sm:text-sm",
              step === s.id ? "bg-amber/12 text-amber" : "text-muted hover:text-fg",
            )}
          >
            <span
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-full border text-xs",
                step === s.id ? "border-amber bg-amber text-on-amber" : "border-line-strong",
              )}
            >
              {i + 1}
            </span>
            <span className="hidden sm:inline">{s.label}</span>
          </button>
        ))}
      </nav>
      <p className="mb-4 text-sm font-medium sm:hidden">{STEPS[stepIndex].label}</p>

      {step === "pagrindine" && <BasicStep form={form} set={set} data={data} labels={labels} errorField={errorField} />}
      {step === "nuotraukos" && <PhotosStep carId={data.id} images={data.images} />}
      {step === "kainos" && (
        <PublishStep carId={data.id} form={form} set={set} data={data} isAdmin={isAdmin} errorField={errorField} />
      )}

      <div className="mt-6 flex justify-between gap-3">
        {stepIndex > 0 ? (
          <button
            type="button"
            onClick={() => goTo(STEPS[stepIndex - 1].id)}
            className="text-sm text-muted hover:text-fg"
          >
            ← {STEPS[stepIndex - 1].label}
          </button>
        ) : (
          <span />
        )}
        {stepIndex < STEPS.length - 1 && (
          <button
            type="button"
            onClick={() => goTo(STEPS[stepIndex + 1].id)}
            className="rounded-pill bg-amber px-5 py-2.5 text-sm font-semibold text-on-amber transition-colors hover:bg-amber-soft"
          >
            Toliau: {STEPS[stepIndex + 1].label} →
          </button>
        )}
      </div>
    </>
  );
}

function SaveIndicator({ save, onRetry }: { save: SaveState; onRetry: () => void }) {
  const time =
    save.state === "saved"
      ? new Date(save.at).toLocaleTimeString("lt-LT", { hour: "2-digit", minute: "2-digit" })
      : null;
  return (
    <span className="flex items-center gap-2 text-sm text-muted" role="status" aria-live="polite">
      {save.state === "saving" && (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden /> Saugoma…
        </>
      )}
      {save.state === "saved" && (
        <>
          <Check className="size-4 text-free" aria-hidden /> Išsaugota {time}
        </>
      )}
      {save.state === "idle" && "Pakeitimai išsaugomi automatiškai"}
      {save.state === "error" && (
        <button type="button" onClick={onRetry} className="text-busy underline">
          Bandyti dar kartą
        </button>
      )}
    </span>
  );
}
