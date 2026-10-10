import "server-only";

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Sign-up email verification.
 *
 * Codes are 6 digits, hashed with an HMAC key before they touch the database,
 * and expire after 15 minutes. Only the service role can read
 * `email_verifications` (RLS is on with no policies), so this module is
 * server-only.
 */

const CODE_TTL_MINUTES = 15;
const MAX_ATTEMPTS = 5;

export { CODE_TTL_MINUTES, MAX_ATTEMPTS };

function hashingSecret(): string {
  const value =
    process.env.AUTH_VERIFICATION_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!value) {
    throw new Error(
      "Email verification needs AUTH_VERIFICATION_SECRET (or " +
        "SUPABASE_SERVICE_ROLE_KEY) to hash codes.",
    );
  }

  return value;
}

export function hashCode(code: string): string {
  return createHmac("sha256", hashingSecret()).update(code.trim()).digest("hex");
}

function hashMatches(code: string, expected: string): boolean {
  const actual = hashCode(code);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

export function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

interface IssuedCode {
  code: string;
  expiresAt: string;
}

/** Invalidates any earlier pending code, then stores a fresh one. */
export async function issueVerificationCode(
  admin: SupabaseClient,
  userId: string,
  email: string,
): Promise<IssuedCode> {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString();
  const normalized = email.trim().toLowerCase();

  await admin
    .from("email_verifications")
    .update({ consumed_at: new Date().toISOString() })
    .eq("email", normalized)
    .is("consumed_at", null);

  const { error } = await admin.from("email_verifications").insert({
    user_id: userId,
    email: normalized,
    code_hash: hashCode(code),
    expires_at: expiresAt,
  });

  if (error) throw error;
  return { code, expiresAt };
}

export type VerifyResult =
  | { ok: true; userId: string }
  | { ok: false; error: string };

/** Checks a submitted code and consumes it on success. */
export async function consumeVerificationCode(
  admin: SupabaseClient,
  email: string,
  code: string,
): Promise<VerifyResult> {
  const normalized = email.trim().toLowerCase();

  const { data, error } = await admin
    .from("email_verifications")
    .select("id, user_id, code_hash, attempts, expires_at")
    .eq("email", normalized)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    return { ok: false, error: "No pending code for that email. Request a new one." };
  }
  if (new Date(data.expires_at).getTime() < Date.now()) {
    return { ok: false, error: "That code has expired. Request a new one." };
  }
  if (data.attempts >= MAX_ATTEMPTS) {
    return { ok: false, error: "Too many attempts. Request a new code." };
  }

  if (!hashMatches(code, data.code_hash)) {
    await admin
      .from("email_verifications")
      .update({ attempts: data.attempts + 1 })
      .eq("id", data.id);
    return { ok: false, error: "That code isn't right. Check the email and try again." };
  }

  await admin
    .from("email_verifications")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", data.id);

  return { ok: true, userId: data.user_id };
}
