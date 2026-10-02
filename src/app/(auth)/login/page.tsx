"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { LogoMark } from "@/components/brand/Logo";
import { GoogleGMark } from "@/components/checkout/ExpressCheckout";
import { createClient } from "@/lib/supabase/client";

const BENEFITS = [
  "Saved delivery details for one-tap checkout",
  "Live order tracking and dispatch notifications",
  "Archive access to previous acquisitions",
  "Early invitation to series releases",
];

function LoginPanel() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { configured, loading } = useAuth();
  const [pending, setPending] = useState(false);
  const [signInError, setSignInError] = useState("");
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
  const isGoogleClientConfigured =
    googleClientId.includes(".apps.googleusercontent.com") &&
    !googleClientId.includes("your-google-client-id");

  const next = searchParams.get("next") ?? "/account";
  const error = signInError || searchParams.get("error") || "";

  async function handleSuccess(credentialResponse: { credential?: string }) {
    if (pending) return;

    if (!credentialResponse.credential) {
      setSignInError("Google did not return a credential.");
      setPending(false);
      return;
    }

    setPending(true);
    setSignInError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: credentialResponse.credential,
    });

    if (error) {
      setSignInError(error.message);
      setPending(false);
      return;
    }

    router.push(next.startsWith("/") ? next : "/account");
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-14 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-2 lg:items-center lg:gap-20">
      {/* Pitch */}
      <div>
        <LogoMark className="h-11 w-auto text-ink" />
        <h1 className="mt-7 font-display text-[38px] font-light leading-[1.1] text-ink sm:text-[46px]">
          Your haven, remembered.
        </h1>
        <p className="mt-5 max-w-md text-[13.5px] leading-relaxed text-muted">
          Sign in to keep your delivery details, follow your orders from the
          workshop to your door, and return to pieces you&rsquo;ve been
          considering.
        </p>

        <ul className="mt-9 space-y-3.5">
          {BENEFITS.map((benefit) => (
            <li key={benefit} className="flex items-start gap-3">
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-terracotta" />
              <span className="text-[12.5px] leading-relaxed text-ink-soft">
                {benefit}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Card */}
      <div className="border border-line bg-surface p-8 sm:p-10">
        <h2 className="font-display text-[24px] text-ink">Sign in</h2>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
          We use Google for authentication. Haven never sees or stores your
          password.
        </p>

        {!configured && (
          <div className="mt-6 flex gap-3 border border-terracotta/30 bg-terracotta-50 px-4 py-3.5">
            <AlertCircle size={15} className="mt-0.5 shrink-0 text-terracotta" />
            <p className="text-[11.5px] leading-relaxed text-terracotta">
              Google sign-in isn&rsquo;t configured on this deployment. Add your
              Supabase and Google credentials to{" "}
              <code className="font-mono">.env.local</code> — see{" "}
              <code className="font-mono">SETUP.md</code>. You can still check
              out as a guest.
            </p>
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="mt-6 border border-terracotta/30 bg-terracotta-50 px-4 py-3 text-[11.5px] leading-relaxed text-terracotta"
          >
            {error}
          </p>
        )}

        <div className="mt-7">
          {pending || loading ? (
            <div className="flex w-full items-center justify-center gap-3 border border-line-strong bg-white px-6 py-4 text-[13.5px] font-medium text-ink">
              <Loader2 size={17} className="animate-spin text-muted" />
              <span>Signing in…</span>
            </div>
          ) : !configured || !isGoogleClientConfigured ? (
            <button
              type="button"
              disabled
              className="flex w-full items-center justify-center gap-3 border border-line-strong bg-white px-6 py-4 text-[13.5px] font-medium text-ink opacity-60"
            >
              <GoogleGMark className="h-[18px] w-[18px]" />
              Continue with Google
            </button>
          ) : (
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={() => {
                setPending(false);
                setSignInError("Google sign-in failed. Please try again.");
              }}
              width={300}
              theme="outline"
              text="continue_with"
              shape="rectangular"
              logo_alignment="left"
              size="large"
            />
          )}
        </div>

        <div className="mt-6 flex items-center gap-4">
          <span className="h-px flex-1 bg-line" />
          <span className="eyebrow text-muted">or</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <Link
          href="/checkout"
          className="eyebrow mt-6 flex items-center justify-center gap-2 py-2 text-muted transition-colors hover:text-ink"
        >
          Continue as a guest
          <ArrowRight size={12} />
        </Link>

        <p className="mt-7 border-t border-line pt-6 text-[11px] leading-relaxed text-muted">
          By continuing you agree to our{" "}
          <Link href="/terms-of-commission" className="text-ink-soft underline underline-offset-2">
            Terms of Commission
          </Link>{" "}
          and{" "}
          <Link href="/privacy-policy" className="text-ink-soft underline underline-offset-2">
            Privacy Protocol
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
  const isGoogleClientConfigured =
    googleClientId.includes(".apps.googleusercontent.com") &&
    !googleClientId.includes("your-google-client-id");

  const content = (
    <Suspense
      fallback={
        <div className="px-5 py-32 text-center">
          <p className="eyebrow text-muted">Loading…</p>
        </div>
      }
    >
      <LoginPanel />
    </Suspense>
  );

  if (!isGoogleClientConfigured) return content;

  return <GoogleOAuthProvider clientId={googleClientId}>{content}</GoogleOAuthProvider>;
}
