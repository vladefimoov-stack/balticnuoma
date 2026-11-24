import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Resend } from "resend";

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string | null;
  /** Resend deduplicates sends with the same key for 24 h (safe retries). */
  idempotencyKey?: string;
};

export type SendResult = { sent: true; id: string | null } | { sent: false; reason: "not_configured" | "error" };

/** "jonas@example.lt" → "jo***@example.lt" — enough to debug, no full address in logs. */
function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  return `${user.slice(0, 2)}***@${domain ?? ""}`;
}

/**
 * Sends one email through Resend. Without RESEND_API_KEY nothing is sent and the
 * site keeps working (the booking is still stored); a line is logged instead.
 * Locally, EMAIL_PREVIEW_DIR=<dir> also writes every email as an .html file.
 */
export async function sendEmail(email: OutgoingEmail): Promise<SendResult> {
  await writePreview(email);

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.info(`[email] RESEND_API_KEY is not set — skipped "${email.subject}" → ${maskEmail(email.to)}`);
    return { sent: false, reason: "not_configured" };
  }

  const from = process.env.EMAIL_FROM?.trim() || "Baltic Nuoma <onboarding@resend.dev>";
  try {
    const { data, error } = await new Resend(apiKey).emails.send(
      {
        from,
        to: email.to,
        subject: email.subject,
        html: email.html,
        text: email.text,
        ...(email.replyTo ? { replyTo: email.replyTo } : {}),
      },
      email.idempotencyKey ? { idempotencyKey: email.idempotencyKey } : undefined,
    );
    if (error) {
      console.error(
        `[email] Resend refused "${email.subject}" → ${maskEmail(email.to)}: ${error.name} ${error.message}`,
      );
      return { sent: false, reason: "error" };
    }
    return { sent: true, id: data?.id ?? null };
  } catch (error) {
    console.error(`[email] sending "${email.subject}" failed:`, error);
    return { sent: false, reason: "error" };
  }
}

async function writePreview(email: OutgoingEmail) {
  const dir = process.env.EMAIL_PREVIEW_DIR?.trim();
  if (!dir || (process.env.NODE_ENV === "production" && process.env.VERCEL)) return;
  try {
    await mkdir(dir, { recursive: true });
    const name = (email.idempotencyKey ?? `${Date.now()}`).replace(/[^a-z0-9-]+/gi, "_");
    await writeFile(path.join(dir, `${name}.html`), email.html, "utf8");
    await writeFile(
      path.join(dir, `${name}.txt`),
      `To: ${email.to}\nSubject: ${email.subject}\n\n${email.text}`,
      "utf8",
    );
  } catch (error) {
    console.warn("[email] could not write preview:", error);
  }
}
