/**
 * Supabase connection settings. Public values are inlined at build time.
 * `isSupabaseConfigured` lets pages render a graceful fallback (e.g. on a fresh
 * Vercel deploy before env vars are added) instead of failing the build.
 */

/**
 * Tolerate common copy-paste mistakes: whitespace, trailing slashes and the
 * REST endpoint suffix ("https://<ref>.supabase.co/rest/v1/" → "https://<ref>.supabase.co").
 */
export function normalizeSupabaseUrl(raw: string | undefined) {
  return (raw ?? "")
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/(rest|auth|storage)\/v1$/, "");
}

export const supabaseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
export const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export function assertSupabaseEnv() {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example).",
    );
  }
}

/** Public URL of a file in a public Storage bucket (`car-images`, `models`). */
export function storagePublicUrl(bucket: "car-images" | "models", path: string) {
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
}
