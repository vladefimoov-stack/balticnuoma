import "server-only";
import { Resend } from "resend";

/**
 * Email (Resend) self-checks for /api/health and the admin's "test email" button.
 * Never returns the API key or private addresses; Resend's error messages are safe to show.
 */

type Check = { ok: boolean; detail: string };

const ADDRESS = /^[^\s<>"@]+@([^\s<>"@]+\.[^\s<>"@]+)$/;

/** "Baltic Nuoma <rezervacijos@balticnuoma.lt>" or "rezervacijos@balticnuoma.lt". */
export function describeFrom(raw: string | undefined): Check & { domain: string | null } {
  const from = (raw ?? "").trim();
  if (!from) {
    return {
      ok: false,
      domain: null,
      detail: "EMAIL_FROM is not set — falls back to onboarding@resend.dev (delivers only to the Resend account owner)",
    };
  }
  if (/^["'].*["']$/.test(from))
    return { ok: false, domain: null, detail: "EMAIL_FROM is wrapped in quotes — remove them" };
  const named = /^(.+?)\s*<([^<>]+)>$/.exec(from);
  const address = (named ? named[2] : from).trim();
  const match = ADDRESS.exec(address);
  if (!match) return { ok: false, domain: null, detail: "EMAIL_FROM is not a valid address (Name <box@domain>)" };
  return { ok: true, domain: match[1].toLowerCase(), detail: `sender domain ${match[1].toLowerCase()}` };
}

let keyCache: { at: number; key: string; result: Check } | null = null;

/** Is the API key accepted, and is the sender's domain verified (when the key may list domains)? */
export async function checkResendKey(key: string | undefined, fromDomain: string | null): Promise<Check> {
  const apiKey = key?.trim();
  if (!apiKey)
    return { ok: false, detail: "RESEND_API_KEY is not set in this deployment (add it in Vercel, then Redeploy)" };
  if (keyCache && keyCache.key === apiKey && Date.now() - keyCache.at < 60_000) return keyCache.result;

  const res = await fetch("https://api.resend.com/domains", {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as {
    name?: string;
    message?: string;
    data?: Array<{ name: string; status: string; region?: string }>;
  };

  let result: Check;
  if (res.ok) {
    const domain = body.data?.find((d) => d.name === fromDomain);
    result = domain
      ? { ok: domain.status === "verified", detail: `key ok; ${domain.name}: ${domain.status}` }
      : { ok: false, detail: `key ok, but ${fromDomain ?? "the sender domain"} is not in this Resend account` };
  } else if (body.name === "restricted_api_key") {
    // A "Sending access" key can't list domains — which proves it is a valid key.
    result = { ok: true, detail: "key ok (sending access only)" };
  } else {
    result = {
      ok: false,
      detail: `${res.status} ${body.name ?? ""}: ${body.message ?? "Resend refused the key"}`.trim(),
    };
  }
  keyCache = { at: Date.now(), key: apiKey, result };
  return result;
}

/** Real send to Resend's sink address (no inbox, no reputation impact). */
export async function testSendToSink(): Promise<Check> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { ok: false, detail: "RESEND_API_KEY is not set" };
  const from = process.env.EMAIL_FROM?.trim() || "Baltic Nuoma <onboarding@resend.dev>";
  const { data, error } = await new Resend(apiKey).emails.send({
    from,
    to: "delivered@resend.dev",
    subject: "Baltic Nuoma — health check",
    text: "Automatic delivery test from /api/health.",
  });
  if (error) return { ok: false, detail: `${error.name}: ${error.message}` };
  return { ok: true, detail: `accepted by Resend (id ${data?.id ?? "?"})` };
}
