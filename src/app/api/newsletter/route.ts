import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminConfigured } from "@/lib/config";
import { newsletterSchema } from "@/lib/validation";

export const runtime = "nodejs";

/** Gazette signup. Writes to `public.subscribers`. */
export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const parsed = newsletterSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Enter a valid email." },
      { status: 422 },
    );
  }

  const email = parsed.data.email.toLowerCase();

  if (!isAdminConfigured) {
    console.warn(`[newsletter] Supabase not configured — ignored ${email}.`);
    return NextResponse.json(
      { error: "Subscriptions aren't connected yet. Please try again later." },
      { status: 503 },
    );
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("subscribers")
      .upsert(
        { email, source: "footer" },
        { onConflict: "email", ignoreDuplicates: true },
      );

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[newsletter] subscribe failed:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
