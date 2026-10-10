import { NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminConfigured } from "@/lib/config";
import { isMailgunConfigured, sendEmail } from "@/lib/mailgun";
import { verificationEmail } from "@/lib/emails";
import {
  CODE_TTL_MINUTES,
  issueVerificationCode,
} from "@/lib/auth-verification";

export const runtime = "nodejs";

/** The app calls this from a native fetch; the website from the same origin. */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

const signUpSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(200),
  password: z.string().min(6, "Use at least 6 characters").max(200),
  fullName: z.string().trim().min(1, "Enter your name").max(120),
});

/**
 * Starts an email/password sign-up.
 *
 * The auth user is created unconfirmed, so `signInWithPassword` is rejected
 * until the Mailgun code is verified. When Mailgun is not configured the
 * account is auto-confirmed instead, and the response tells the client there is
 * nothing to verify.
 */
export async function POST(request: Request) {
  if (!isAdminConfigured) {
    return NextResponse.json(
      { error: "Accounts are not configured on this deployment." },
      { status: 503, headers: CORS_HEADERS },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Malformed request." },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue?.message ?? "Please check your details." },
      { status: 422, headers: CORS_HEADERS },
    );
  }

  const { email, password, fullName } = parsed.data;
  const admin = createAdminClient();
  const mailgunReady = isMailgunConfigured();

  try {
    const { data: existingRows } = await admin.rpc("find_auth_user", {
      p_email: email,
    });
    const existing = (existingRows as
      | { id: string; email: string; email_confirmed: boolean }[]
      | null)?.[0];

    if (existing?.email_confirmed) {
      return NextResponse.json(
        {
          error:
            "An account with this email already exists. Sign in instead, or reset your password.",
        },
        { status: 409, headers: CORS_HEADERS },
      );
    }

    let userId: string;

    if (existing) {
      // Re-registering before confirming: keep the same row, take the latest
      // password so the customer is not locked out by a typo in the first try.
      const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
        password,
        user_metadata: { full_name: fullName },
      });
      if (error || !data.user) throw error ?? new Error("Could not update account.");
      userId = data.user.id;
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
        user_metadata: { full_name: fullName },
      });
      if (error || !data.user) throw error ?? new Error("Could not create account.");
      userId = data.user.id;
    }

    if (!mailgunReady) {
      await admin.auth.admin.updateUserById(userId, { email_confirm: true });
      return NextResponse.json(
        { ok: true, email, needsVerification: false },
        { headers: CORS_HEADERS },
      );
    }

    const { code } = await issueVerificationCode(admin, userId, email);
    const template = verificationEmail({
      fullName,
      code,
      expiresInMinutes: CODE_TTL_MINUTES,
    });

    const sent = await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      tags: ["account-verification"],
    });

    if (!sent.ok) {
      return NextResponse.json(
        {
          error:
            "We could not send your verification email. Please try again in a moment.",
        },
        { status: 502, headers: CORS_HEADERS },
      );
    }

    return NextResponse.json(
      { ok: true, email, needsVerification: true },
      { headers: CORS_HEADERS },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sign-up failed.";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
