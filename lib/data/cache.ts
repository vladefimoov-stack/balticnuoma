/**
 * Cache tags for public data. Pages are static (ISR); admin actions call
 * `revalidateTag(...)` after a change so the site updates immediately.
 */
export const CACHE_TAGS = {
  settings: "settings",
  categories: "categories",
  cars: "cars",
} as const;

/** Time-based refresh (seconds): DB edits show up within ~5 min; admin actions also revalidate by tag. */
export const PUBLIC_REVALIDATE_SECONDS = 300;
