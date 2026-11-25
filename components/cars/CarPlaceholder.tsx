import { useId } from "react";
import type { BodyType } from "@/lib/supabase/types";
import { BODY, GLASS, PILLAR, SHAPE_BY_BODY } from "./car-shapes";
import { cn } from "@/lib/utils/cn";

/**
 * Stylized side silhouette shown until a car has photos.
 * Three shapes cover every body type; drawn as lines in the brand gradient.
 */
export function CarPlaceholder({ bodyType, className }: { bodyType: BodyType | null; className?: string }) {
  const id = useId().replace(/:/g, "");
  const shape = SHAPE_BY_BODY[bodyType ?? "sedan"];

  return (
    <svg viewBox="0 0 400 160" className={cn("h-auto w-full", className)} aria-hidden fill="none">
      <defs>
        <linearGradient id={`${id}-line`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--color-amber)" />
          <stop offset="0.6" stopColor="var(--color-amber-soft)" />
          <stop offset="1" stopColor="var(--color-silver)" />
        </linearGradient>
        <linearGradient id={`${id}-floor`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--color-amber)" stopOpacity="0" />
          <stop offset="0.5" stopColor="var(--color-amber)" stopOpacity="0.7" />
          <stop offset="1" stopColor="var(--color-amber)" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="var(--color-amber)" stopOpacity="0.18" />
          <stop offset="1" stopColor="var(--color-amber)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="200" cy="130" rx="190" ry="14" fill={`url(#${id}-glow)`} />
      <path d="M10 129 H390" stroke={`url(#${id}-floor)`} strokeWidth="1" />

      <path
        d={BODY[shape]}
        stroke={`url(#${id}-line)`}
        strokeWidth="1.6"
        strokeLinejoin="round"
        fill="rgb(255 255 255 / 0.02)"
      />
      <path d={GLASS[shape]} stroke="rgb(201 209 220 / 0.45)" strokeWidth="1.2" fill="rgb(201 209 220 / 0.05)" />
      <path
        d={`M${PILLAR[shape]} ${shape === "suv" ? 37 : 46} V${shape === "suv" ? 68 : 75}`}
        stroke="rgb(201 209 220 / 0.35)"
        strokeWidth="1.2"
      />
      {/* belt line */}
      <path d="M70 92 C150 88 260 86 360 88" stroke="rgb(255 255 255 / 0.08)" strokeWidth="1" />

      {[96, 306].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="107" r="22" stroke="rgb(201 209 220 / 0.55)" strokeWidth="1.4" />
          <circle cx={cx} cy="107" r="11" stroke="rgb(201 209 220 / 0.25)" strokeWidth="1" />
        </g>
      ))}

      {/* head & tail lights */}
      <path d="M26 96 L44 92" stroke="var(--color-amber)" strokeWidth="2.2" strokeLinecap="round" />
      <path
        d="M372 88 L377 100"
        stroke="var(--color-busy)"
        strokeOpacity="0.8"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
