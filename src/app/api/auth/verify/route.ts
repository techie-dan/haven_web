import { NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminConfigured } from "@/lib/config";
import { consumeVerificationCode } from "@/lib/auth-verification";

export const runtime = "nodejs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

const verifySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

/** Confirms an account once the Mailgun code checks out. */
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

  const parsed = verifySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Enter the 6-digit code." },
      { status: 422, headers: CORS_HEADERS },
    );
  }

  const admin = createAdminClient();

  try {
    const result = await consumeVerificationCode(
      admin,
      parsed.data.email,
      parsed.data.code,
    );

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const { error } = await admin.auth.admin.updateUserById(result.userId, {
      email_confirm: true,
    });
    if (error) throw error;

    return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not verify the code.",
      },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
