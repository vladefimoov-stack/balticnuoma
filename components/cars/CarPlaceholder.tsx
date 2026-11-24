import { useId } from "react";
import type { BodyType } from "@/lib/supabase/types";
import { cn } from "@/lib/utils/cn";

/**
 * Stylized side silhouette shown until a car has photos.
 * Three shapes cover every body type; drawn as lines in the brand gradient.
 */
type Shape = "liftback" | "sedan" | "suv";

const SHAPE_BY_BODY: Record<BodyType, Shape> = {
  hatchback: "liftback",
  wagon: "liftback",
  sedan: "sedan",
  coupe: "sedan",
  cabrio: "sedan",
  suv: "suv",
  minivan: "suv",
  van: "suv",
};

// viewBox 0 0 400 160, ground at y = 129, wheels at (96, 107) and (306, 107), r = 22; arches r = 27.
const BODY: Record<Shape, string> = {
  liftback:
    "M30 116 C22 114 20 104 24 98 L30 90 C48 84 92 78 132 74 L176 46 C190 40 236 38 268 44 C300 50 340 66 370 82 C378 88 380 100 376 110 L372 116 L331.1 116 A27 27 0 1 0 280.9 116 L121.1 116 A27 27 0 1 0 70.9 116 Z",
  sedan:
    "M28 116 C20 112 20 102 26 96 L34 90 C54 84 96 80 140 76 L184 50 C198 44 238 42 262 46 C282 50 304 64 322 74 C342 76 362 78 372 84 C378 90 380 104 374 116 L331.1 116 A27 27 0 1 0 280.9 116 L121.1 116 A27 27 0 1 0 70.9 116 Z",
  suv: "M28 116 C20 112 20 98 24 90 L30 80 C52 74 96 70 128 68 L162 38 C172 32 222 30 300 32 C330 34 352 40 364 50 C372 60 378 80 378 96 L376 116 L331.1 116 A27 27 0 1 0 280.9 116 L121.1 116 A27 27 0 1 0 70.9 116 Z",
};

const GLASS: Record<Shape, string> = {
  liftback: "M142 74 L180 50 C196 44 232 43 262 48 C288 53 316 64 336 76 Z",
  sedan: "M150 75 L188 53 C202 48 236 46 258 50 C276 54 292 64 306 73 Z",
  suv: "M138 68 L168 42 C178 37 224 36 296 37 C318 38 334 44 344 56 L346 68 Z",
};

const PILLAR: Record<Shape, number> = { liftback: 238, sedan: 232, suv: 240 };

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
