import type { ComponentProps, ReactNode } from "react";
import type { BookingStatus, CarStatus } from "@/lib/supabase/types";
import { cn } from "@/lib/utils/cn";

/* Small building blocks of the admin panel (server-safe, no hooks). */

export const adminInput =
  "h-11 w-full rounded-xl border border-line-strong bg-bg/70 px-3.5 text-sm text-fg [color-scheme:dark] transition-colors placeholder:text-muted/60 hover:border-white/25 focus:border-amber focus:outline-none disabled:opacity-60 aria-[invalid=true]:border-busy/80";

export const adminLabel = "text-xs font-medium tracking-wide text-muted";

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1.5">
        {back}
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-[1.75rem]">{title}</h1>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Card({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("rounded-card border border-line bg-surface p-4 sm:p-5", className)} {...props} />;
}

export function CardTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold tracking-wide text-fg">{children}</h2>
      {aside}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">{children}</p>
  );
}

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "Laukia patvirtinimo",
  confirmed: "Patvirtinta",
  rejected: "Atmesta",
  cancelled: "Atšaukta",
};

const BOOKING_STATUS_CLASS: Record<BookingStatus, string> = {
  pending: "bg-pending/15 text-pending ring-pending/30",
  confirmed: "bg-free/15 text-free ring-free/30",
  rejected: "bg-busy/15 text-busy ring-busy/30",
  cancelled: "bg-blocked/20 text-silver ring-blocked/40",
};

export function BookingStatusBadge({ status, className }: { status: BookingStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-semibold whitespace-nowrap ring-1 ring-inset",
        BOOKING_STATUS_CLASS[status],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {BOOKING_STATUS_LABEL[status]}
    </span>
  );
}

export const CAR_STATUS_LABEL: Record<CarStatus, string> = {
  draft: "Juodraštis",
  published: "Paskelbta",
  hidden: "Paslėpta",
  maintenance: "Remontas / TO",
};

const CAR_STATUS_CLASS: Record<CarStatus, string> = {
  draft: "bg-white/5 text-muted ring-line-strong",
  published: "bg-free/15 text-free ring-free/30",
  hidden: "bg-blocked/20 text-silver ring-blocked/40",
  maintenance: "bg-pending/15 text-pending ring-pending/30",
};

export function CarStatusBadge({ status }: { status: CarStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill px-2.5 py-1 text-xs font-semibold whitespace-nowrap ring-1 ring-inset",
        CAR_STATUS_CLASS[status],
      )}
    >
      {CAR_STATUS_LABEL[status]}
    </span>
  );
}

/** Inline notice (success / warning / error) at the top of a form or card. */
export function Notice({
  tone = "info",
  children,
  className,
}: {
  tone?: "info" | "success" | "warning" | "error";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    info: "border-line-strong bg-white/[0.03] text-fg",
    success: "border-free/30 bg-free/10 text-fg",
    warning: "border-pending/35 bg-pending/10 text-fg",
    error: "border-busy/35 bg-busy/10 text-fg",
  };
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("rounded-xl border px-4 py-3 text-sm", tones[tone], className)}
    >
      {children}
    </div>
  );
}
