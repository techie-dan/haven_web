import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Google OAuth callback.
 *
 * Supabase redirects here with a `code` after the user consents. We exchange it
 * for a session, which `@supabase/ssr` writes into cookies so the server
 * components and middleware can see it.
 *
 * Configure the redirect URL in two places:
 *   1. Google Cloud Console → Credentials → OAuth client → Authorised redirect
 *      URIs:  https://<project-ref>.supabase.co/auth/v1/callback
 *   2. Supabase → Authentication → URL Configuration → Redirect URLs:
 *      http://localhost:3000/auth/callback  (and your production origin)
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/account";
  const errorDescription = searchParams.get("error_description");

  // The user declined consent, or Google returned an error.
  if (errorDescription) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDescription)}`,
    );
  }

  if (!code) {
    // Email confirmation links (from Supabase Auth, delivered by Mailgun SMTP
    // when configured) arrive as `token_hash` + `type` rather than an OAuth
    // `code`.
    if (!tokenHash || !type) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent("Missing authorization code.")}`,
      );
    }
  }

  try {
    const supabase = await createClient();
    const { error } = tokenHash && type
      ? await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
      : await supabase.auth.exchangeCodeForSession(code!);

    if (error) throw error;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not complete sign-in.";
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(message)}`,
    );
  }

  // Allow mobile deep links (havenmobile:// or exp://) or same-site relative paths.
  const isMobileDeepLink =
    next.startsWith("havenmobile://") || next.startsWith("exp://");
  const safeNext = isMobileDeepLink
    ? next
    : next.startsWith("/") && !next.startsWith("//")
      ? next
      : "/account";

  return NextResponse.redirect(isMobileDeepLink ? safeNext : `${origin}${safeNext}`);
}

