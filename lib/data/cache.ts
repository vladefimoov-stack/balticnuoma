/**
 * Cache tags for public data. Pages are static (ISR); admin actions call
 * `revalidateTag(...)` after a change so the site updates immediately.
 */
export const CACHE_TAGS = {
  settings: "settings",
  categories: "categories",
  cars: "cars",
} as const;

/** Time-based safety net (seconds) on top of on-demand revalidation. */
export const PUBLIC_REVALIDATE_SECONDS = 3600;
