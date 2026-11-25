import type { BodyType } from "@/lib/supabase/types";

/** Side-silhouette path data shared by <CarPlaceholder> and the OG image cards. */
export type Shape = "liftback" | "sedan" | "suv";

export const SHAPE_BY_BODY: Record<BodyType, Shape> = {
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
export const BODY: Record<Shape, string> = {
  liftback:
    "M30 116 C22 114 20 104 24 98 L30 90 C48 84 92 78 132 74 L176 46 C190 40 236 38 268 44 C300 50 340 66 370 82 C378 88 380 100 376 110 L372 116 L331.1 116 A27 27 0 1 0 280.9 116 L121.1 116 A27 27 0 1 0 70.9 116 Z",
  sedan:
    "M28 116 C20 112 20 102 26 96 L34 90 C54 84 96 80 140 76 L184 50 C198 44 238 42 262 46 C282 50 304 64 322 74 C342 76 362 78 372 84 C378 90 380 104 374 116 L331.1 116 A27 27 0 1 0 280.9 116 L121.1 116 A27 27 0 1 0 70.9 116 Z",
  suv: "M28 116 C20 112 20 98 24 90 L30 80 C52 74 96 70 128 68 L162 38 C172 32 222 30 300 32 C330 34 352 40 364 50 C372 60 378 80 378 96 L376 116 L331.1 116 A27 27 0 1 0 280.9 116 L121.1 116 A27 27 0 1 0 70.9 116 Z",
};

export const GLASS: Record<Shape, string> = {
  liftback: "M142 74 L180 50 C196 44 232 43 262 48 C288 53 316 64 336 76 Z",
  sedan: "M150 75 L188 53 C202 48 236 46 258 50 C276 54 292 64 306 73 Z",
  suv: "M138 68 L168 42 C178 37 224 36 296 37 C318 38 334 44 344 56 L346 68 Z",
};

export const PILLAR: Record<Shape, number> = { liftback: 238, sedan: 232, suv: 240 };
