import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Sign-out.
 *
 * A POST rather than a link, so it cannot be triggered by a cross-site image
 * or prefetch. Clears the session cookies and returns to the storefront.
 */
export async function POST(request: Request) {
  const { origin } = new URL(request.url);

  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Already signed out, or Supabase unconfigured — nothing to clear.
  }

  return NextResponse.redirect(`${origin}/`, { status: 303 });
}
