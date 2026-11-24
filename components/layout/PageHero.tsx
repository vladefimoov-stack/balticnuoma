import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type PageHeroProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
};

/** Standard header for inner pages: eyebrow, H1, lead text, optional actions. */
export function PageHero({ eyebrow, title, description, children, className }: PageHeroProps) {
  return (
    <section
      className={cn(
        "relative border-b border-line pt-[calc(var(--nav-height)+4.5rem)] pb-16 bg-aurora md:pb-20",
        className,
      )}
    >
      <div className="container-site">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="mt-4 max-w-4xl text-display-lg font-semibold">{title}</h1>
        {description && <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">{description}</p>}
        {children && <div className="mt-10">{children}</div>}
      </div>
      <div aria-hidden className="absolute inset-x-0 -bottom-px hairline-accent opacity-40" />
    </section>
  );
}
