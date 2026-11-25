"use client";

import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { lockScroll } from "@/lib/motion/lenis";

export type BookingSuccess = { number: string | null; email: string | null };

/**
 * "Užklausa išsiųsta!" popup. A native modal <dialog>: focus is trapped inside, Esc and a
 * click on the backdrop close it, and focus returns to the widget via `onClose`.
 */
export function SuccessDialog({ result, onClose }: { result: BookingSuccess | null; onClose: () => void }) {
  const t = useTranslations("booking.success");
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (result && !dialog.open) {
      dialog.showModal();
      lockScroll(true);
    } else if (!result && dialog.open) {
      dialog.close();
    }
  }, [result]);

  // Never leave the page locked if the widget unmounts while the popup is open.
  useEffect(() => () => lockScroll(false), []);

  return (
    <dialog
      ref={ref}
      aria-labelledby="booking-success-title"
      aria-describedby="booking-success-text"
      data-lenis-prevent
      onClose={() => {
        lockScroll(false);
        onClose();
      }}
      onClick={(event) => {
        // The dialog element itself is only hit on the backdrop (content fills the box).
        if (event.target === event.currentTarget) ref.current?.close();
      }}
      className="m-auto w-[min(26rem,calc(100vw-2rem))] overflow-visible rounded-card border border-line-strong bg-surface p-0 text-fg shadow-card transition-[opacity,scale] duration-200 ease-out backdrop:bg-black/70 backdrop:backdrop-blur-sm starting:open:scale-95 starting:open:opacity-0"
    >
      {result && (
        <div className="flex flex-col items-center gap-4 px-6 py-8 text-center sm:px-8">
          <span className="grid size-14 place-items-center rounded-full bg-free/15">
            <CheckCircle2 className="size-8 text-free" aria-hidden />
          </span>
          <h2 id="booking-success-title" className="font-display text-xl font-semibold">
            {t("title")}
          </h2>
          {result.number && (
            <p className="flex w-full flex-col gap-1 rounded-xl border border-line bg-bg/60 px-4 py-3">
              <span className="text-xs tracking-wide text-muted uppercase">{t("number")}</span>
              <span className="font-display text-2xl font-semibold tracking-wide text-amber">{result.number}</span>
            </p>
          )}
          <div id="booking-success-text" className="flex flex-col gap-2 text-sm leading-relaxed text-muted">
            <p>{t("next")}</p>
            {result.email && <p>{t("emailCopy", { email: result.email })}</p>}
          </div>
          <Button autoFocus size="lg" className="mt-2 w-full" onClick={() => ref.current?.close()}>
            {t("close")}
          </Button>
        </div>
      )}
    </dialog>
  );
}
