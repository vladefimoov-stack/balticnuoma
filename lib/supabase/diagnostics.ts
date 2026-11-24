import "server-only";
import { supabaseUrl } from "./env";

/* Configuration diagnostics for /api/health. Server-only; never returns secret values. */

/** Human-readable problem with the configured URL, or null if it looks right. */
export function describeSupabaseUrlProblem(url: string = supabaseUrl): string | null {
  if (!url) return "NEXT_PUBLIC_SUPABASE_URL is empty";
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "NEXT_PUBLIC_SUPABASE_URL is not a valid URL";
  }
  if (parsed.hostname.endsWith("supabase.com")) {
    return "NEXT_PUBLIC_SUPABASE_URL points to the Supabase dashboard; use the Project URL https://<ref>.supabase.co";
  }
  if (parsed.protocol !== "https:" && parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") {
    return "NEXT_PUBLIC_SUPABASE_URL must start with https://";
  }
  if (parsed.pathname !== "/" && parsed.pathname !== "") {
    return `NEXT_PUBLIC_SUPABASE_URL has an extra path "${parsed.pathname}"; use only https://<ref>.supabase.co`;
  }
  return null;
}

/** Which kind of key is configured — never reveals the key itself. */
export function describeKeyType(key: string | undefined): string {
  const k = (key ?? "").trim();
  if (!k) return "missing";
  if (k.startsWith("sb_publishable_")) return "publishable";
  if (k.startsWith("sb_secret_")) return "secret";
  if (k.startsWith("eyJ")) {
    try {
      const payload = JSON.parse(Buffer.from(k.split(".")[1] ?? "", "base64url").toString("utf8")) as {
        role?: unknown;
      };
      return `legacy-jwt:${typeof payload.role === "string" ? payload.role : "unknown"}`;
    } catch {
      return "legacy-jwt:invalid";
    }
  }
  return "unknown-format";
}
