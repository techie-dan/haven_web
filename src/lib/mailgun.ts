import "server-only";

/**
 * Mailgun transactional email.
 *
 * Talks to the Mailgun REST API directly with `fetch` + `FormData` (both
 * global in Node 18+). Avoids pulling in the SDK and its `form-data` shim for
 * what is a two-field multipart POST.
 *
 * Configure via .env.local:
 *   MAILGUN_API_KEY      — a *sending* key, not your private API key
 *   MAILGUN_DOMAIN       — e.g. mg.havenstudio.com
 *   MAILGUN_API_BASE     — https://api.mailgun.net (US) or https://api.eu.mailgun.net
 *   MAILGUN_FROM         — "Haven Studio & Living <studio@mg.havenstudio.com>"
 */

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  /** Mailgun tags, useful for filtering in the dashboard. */
  tags?: string[];
  /** Correlates this message with an order in your own logs. */
  variables?: Record<string, string>;
}

export interface SendEmailResult {
  ok: boolean;
  /** Mailgun's message id, e.g. "<20260930120000.1.ABCD@mg.havenstudio.com>" */
  id?: string;
  error?: string;
}

function resolveConfig() {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;

  // Tolerate a base URL that already includes /v3 — strip it so we can append
  // our own path without producing /v3/v3/.
  const base = (process.env.MAILGUN_API_BASE ?? "https://api.mailgun.net")
    .replace(/\/+$/, "")
    .replace(/\/v3$/, "");

  const from =
    process.env.MAILGUN_FROM ??
    (domain ? `Haven Studio & Living <studio@${domain}>` : undefined);

  const missing = [
    !apiKey && "MAILGUN_API_KEY",
    !domain && "MAILGUN_DOMAIN",
    !from && "MAILGUN_FROM",
  ].filter(Boolean) as string[];

  return { apiKey, domain, base, from, missing };
}

/** True when every Mailgun env var needed to send is present. */
export function isMailgunConfigured(): boolean {
  return resolveConfig().missing.length === 0;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const { apiKey, domain, base, from, missing } = resolveConfig();

  if (missing.length > 0) {
    return {
      ok: false,
      error: `Mailgun is not configured — missing ${missing.join(", ")}.`,
    };
  }

  const form = new FormData();
  form.append("from", from!);
  form.append(
    "to",
    Array.isArray(input.to) ? input.to.join(",") : input.to,
  );
  form.append("subject", input.subject);
  form.append("html", input.html);
  form.append("text", input.text);

  const replyTo = input.replyTo ?? process.env.MAILGUN_REPLY_TO;
  if (replyTo) form.append("h:Reply-To", replyTo);

  for (const tag of input.tags ?? []) form.append("o:tag", tag);

  for (const [key, value] of Object.entries(input.variables ?? {})) {
    form.append(`v:${key}`, value);
  }

  try {
    const response = await fetch(`${base}/v3/${domain}/messages`, {
      method: "POST",
      headers: {
        // Buffer.from(...).toString("base64") — btoa is not reliably global in
        // every Node runtime, and the key may contain non-Latin1 characters.
        Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
      },
      body: form,
    });

    const payload = (await response.json().catch(() => null)) as
      | { id?: string; message?: string }
      | null;

    if (!response.ok) {
      return {
        ok: false,
        error:
          payload?.message ??
          `Mailgun responded ${response.status} ${response.statusText}`,
      };
    }

    return { ok: true, id: payload?.id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown Mailgun error",
    };
  }
}
