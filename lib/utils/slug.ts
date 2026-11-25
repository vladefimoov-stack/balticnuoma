/**
 * URL slug, same rules as private.slugify / private.is_valid_slug in Postgres:
 * lowercase a–z, 0–9 and single dashes; Lithuanian letters lose their diacritics.
 */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function slugify(value: string, maxLength = 120) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
}
