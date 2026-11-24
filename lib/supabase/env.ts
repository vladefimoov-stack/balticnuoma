/**
 * Supabase connection settings. Public values are inlined at build time.
 * `isSupabaseConfigured` lets pages render a graceful fallback (e.g. on a fresh
 * Vercel deploy before env vars are added) instead of failing the build.
 */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

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
