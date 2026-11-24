import { cn } from "@/lib/utils/cn";

type LogoMarkProps = { className?: string; title?: string };

/**
 * Brand mark: three waves receding toward the horizon — the Baltic sea that
 * turns into a road. Source files: /public/brand/*.svg
 */
export function LogoMark({ className, title }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn("shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <defs>
        <linearGradient id="bn-mark-g" x1="0" y1="48" x2="48" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--color-amber)" />
          <stop offset=".55" stopColor="var(--color-amber-soft)" />
          <stop offset="1" stopColor="var(--color-silver)" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="url(#bn-mark-g)" strokeLinecap="round">
        <path d="M3 38q10.5-7 21 0t21 0" strokeWidth="3.8" />
        <path d="M15 27q7-4.6 14 0t14 0" strokeWidth="3.1" />
        <path d="M26 17.5q4-2.8 8 0t8 0" strokeWidth="2.5" />
      </g>
    </svg>
  );
}

type LogoProps = { className?: string; markClassName?: string };

/** Horizontal lockup: mark + "BALTIC NUOMA" wordmark (Unbounded). */
export function Logo({ className, markClassName }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={cn("size-8", markClassName)} />
      <span className="translate-y-[0.12em] font-display text-[0.95rem] leading-none tracking-[0.06em] whitespace-nowrap">
        <span className="font-semibold text-fg">BALTIC</span> <span className="font-medium text-muted">NUOMA</span>
      </span>
    </span>
  );
}
