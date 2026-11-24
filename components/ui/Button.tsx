import type { ComponentProps } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

// Buttons are intentionally static: no movement / sweep / glow — only a color change on hover.
const base =
  "inline-flex items-center justify-center gap-2 rounded-pill font-semibold whitespace-nowrap " +
  "transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50 select-none";

const variants: Record<Variant, string> = {
  primary: "bg-amber text-on-amber hover:bg-amber-soft",
  secondary:
    "border border-line-strong bg-white/[0.02] text-fg hover:border-amber/60 hover:bg-white/[0.04] hover:text-amber-soft",
  ghost: "text-muted hover:text-fg",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-xs tracking-wide",
  md: "h-11 px-6 text-sm tracking-wide",
  lg: "h-14 px-8 text-[0.95rem] tracking-wide",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

type StyleProps = { variant?: Variant; size?: Size };

export function Button({ variant, size, className, ...props }: ComponentProps<"button"> & StyleProps) {
  return <button className={buttonClasses({ variant, size, className })} {...props} />;
}

/** Locale-aware internal link styled as a button. */
export function ButtonLink({ variant, size, className, ...props }: ComponentProps<typeof Link> & StyleProps) {
  return <Link className={buttonClasses({ variant, size, className })} {...props} />;
}

/** External / protocol link (tel:, https://wa.me …) styled as a button. */
export function ButtonAnchor({ variant, size, className, ...props }: ComponentProps<"a"> & StyleProps) {
  return <a className={buttonClasses({ variant, size, className })} {...props} />;
}
