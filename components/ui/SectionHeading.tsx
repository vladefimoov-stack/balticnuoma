import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { Reveal, RevealText } from "./Reveal";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  highlight?: string[];
  align?: "left" | "center";
  as?: "h1" | "h2";
  className?: string;
  children?: ReactNode;
};

/** Eyebrow + revealed heading + lead text, used at the top of every section. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  highlight,
  align = "left",
  as = "h2",
  className,
  children,
}: SectionHeadingProps) {
  return (
    <div className={cn("flex flex-col gap-5", align === "center" && "items-center text-center", className)}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <RevealText as={as} text={title} highlight={highlight} className="max-w-3xl text-display-lg font-semibold" />
      {description && (
        <Reveal
          delay={2}
          className={cn("max-w-2xl text-lg leading-relaxed text-muted", align === "center" && "mx-auto")}
        >
          {description}
        </Reveal>
      )}
      {children}
    </div>
  );
}
