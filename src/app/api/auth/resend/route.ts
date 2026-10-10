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

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

const resendSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
});

const RESEND_COOLDOWN_MS = 45_000;

/** Issues a fresh code for an unconfirmed sign-up, subject to a cooldown. */
export async function POST(request: Request) {
  if (!isAdminConfigured) {
    return NextResponse.json(
      { error: "Accounts are not configured on this deployment." },
      { status: 503, headers: CORS_HEADERS },
    );
  }

  if (!isMailgunConfigured()) {
    return NextResponse.json(
      { error: "Email delivery is not configured on this deployment." },
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

  const parsed = resendSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a valid email." },
      { status: 422, headers: CORS_HEADERS },
    );
  }

  const { email } = parsed.data;
  const admin = createAdminClient();

  try {
    const { data: rows } = await admin.rpc("find_auth_user", { p_email: email });
    const existing = (rows as
      | { id: string; email: string; email_confirmed: boolean }[]
      | null)?.[0];

    if (!existing) {
      return NextResponse.json(
        { error: "We couldn't find a pending sign-up for that email." },
        { status: 404, headers: CORS_HEADERS },
      );
    }
    if (existing.email_confirmed) {
      return NextResponse.json(
        { error: "That account is already confirmed. Sign in instead." },
        { status: 409, headers: CORS_HEADERS },
      );
    }

    const { data: last } = await admin
      .from("email_verifications")
      .select("created_at")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (
      last?.created_at &&
      Date.now() - new Date(last.created_at).getTime() < RESEND_COOLDOWN_MS
    ) {
      return NextResponse.json(
        { error: "A code was sent just now. Please wait a few seconds." },
        { status: 429, headers: CORS_HEADERS },
      );
    }

    const { code } = await issueVerificationCode(admin, existing.id, email);
    const template = verificationEmail({ code, expiresInMinutes: CODE_TTL_MINUTES });
    const sent = await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      tags: ["account-verification"],
    });

    if (!sent.ok) {
      return NextResponse.json(
        { error: "We could not send the email. Please try again." },
        { status: 502, headers: CORS_HEADERS },
      );
    }

    return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not resend the code.",
      },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
