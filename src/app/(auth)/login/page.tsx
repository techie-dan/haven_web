"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { LogoMark } from "@/components/brand/Logo";
import { GoogleGMark } from "@/components/checkout/ExpressCheckout";
import { missingPublicEnv } from "@/lib/config";

const BENEFITS = [
  "Saved delivery details for one-tap checkout",
  "Live order tracking and dispatch notifications",
  "Archive access to previous acquisitions",
  "Early invitation to series releases",
];

type Mode = "signin" | "signup" | "verify";

function LoginPanel({ initialMode = "signin" }: { initialMode?: "signin" | "signup" }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const {
    configured,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    verifyEmailCode,
    resendEmailCode,
  } = useAuth();

  const [mode, setMode] = useState<Mode>(initialMode);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [signInError, setSignInError] = useState("");

  const next = searchParams.get("next") ?? "/account";
  const destination = next.startsWith("/") && !next.startsWith("//") ? next : "/account";
  const error = signInError || searchParams.get("error") || "";

  async function handleGoogle() {
    if (pending) return;
    setPending(true);
    setSignInError("");
    const result = await signInWithGoogle(destination);
    setPending(false);
    if (result.error) setSignInError(result.error);
    // On success Supabase redirects the browser — no push() needed.
  }

  async function handleEmailSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setSignInError("");
    setNotice("");

    if (mode === "signin") {
      const result = await signInWithEmail(email.trim(), password);
      setPending(false);
      if (result.error) {
        setSignInError(result.error);
        return;
      }
      router.push(destination);
      return;
    }

    const result = await signUpWithEmail(email.trim(), password, fullName.trim());
    setPending(false);

    if (result.error) {
      setSignInError(result.error);
      return;
    }

    if (result.needsVerification === false) {
      router.push(destination);
      return;
    }

    setMode("verify");
    setCode("");
    setNotice(`We sent a 6-digit code to ${email.trim()}.`);
  }

  async function handleVerify(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setSignInError("");

    const verified = await verifyEmailCode(email.trim(), code.trim());
    if (verified.error) {
      setPending(false);
      setSignInError(verified.error);
      return;
    }

    const signedIn = await signInWithEmail(email.trim(), password);
    setPending(false);

    if (signedIn.error) {
      setMode("signin");
      setNotice("Account confirmed — sign in with your new password.");
      return;
    }

    router.push(destination);
  }

  async function handleResend() {
    if (pending) return;
    setPending(true);
    setSignInError("");
    const result = await resendEmailCode(email.trim());
    setPending(false);
    if (result.error) {
      setSignInError(result.error);
      return;
    }
    setNotice(`A fresh code is on its way to ${email.trim()}.`);
  }

  const inputClass =
    "mt-2 w-full border-b border-line-strong bg-transparent pb-2 text-[13.5px] text-ink placeholder:text-muted focus:outline-none transition-colors focus:border-ink";

  return (
    <div className="mx-auto grid max-w-5xl gap-14 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-2 lg:items-center lg:gap-20">
      {/* Pitch */}
      <div>
        <LogoMark className="h-11 w-auto text-ink" />
        <h1 className="mt-7 font-display text-[38px] font-light leading-[1.1] text-ink sm:text-[46px]">
          Your haven, remembered.
        </h1>
        <p className="mt-5 max-w-md text-[13.5px] leading-relaxed text-muted">
          One account for the website and the app. Sign in to keep your delivery
          details, follow orders from the workshop to your door, and return to
          pieces you&rsquo;ve been considering.
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
        {mode === "verify" ? (
          <>
            <h2 className="font-display text-[24px] text-ink">Confirm your email</h2>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
              Enter the 6-digit code Mailgun delivered to{" "}
              <span className="text-ink">{email}</span> to finish creating your
              account.
            </p>

            {notice && (
              <p className="mt-6 border border-sage/30 bg-sage/10 px-4 py-3 text-[11.5px] leading-relaxed text-sage">
                {notice}
              </p>
            )}
            {error && (
              <p
                role="alert"
                className="mt-6 border border-terracotta/30 bg-terracotta-50 px-4 py-3 text-[11.5px] leading-relaxed text-terracotta"
              >
                {error}
              </p>
            )}

            <form onSubmit={handleVerify} className="mt-7 space-y-5">
              <label className="block">
                <span className="eyebrow text-ink-soft">Verification code</span>
                <input
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  className={`${inputClass} tracking-[0.4em]`}
                />
              </label>
              <button
                type="submit"
                disabled={pending || code.length !== 6}
                className="flex w-full items-center justify-center gap-2 bg-ink px-6 py-4 text-[12px] uppercase tracking-[0.14em] text-white transition-colors hover:bg-terracotta disabled:opacity-50"
              >
                {pending ? <Loader2 size={16} className="animate-spin" /> : null}
                Verify &amp; continue
              </button>
            </form>

            <div className="mt-5 flex items-center justify-between text-[11.5px]">
              <button
                type="button"
                onClick={handleResend}
                className="text-ink-soft underline underline-offset-2"
              >
                Resend code
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setSignInError("");
                  setNotice("");
                }}
                className="text-muted transition-colors hover:text-ink"
              >
                Edit details
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="font-display text-[24px] text-ink">
              {mode === "signin" ? "Sign in" : "Create an account"}
            </h2>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
              Use Google, or an email and password. Sign-up emails are delivered
              by Mailgun so we can confirm it&rsquo;s you.
            </p>

            {!configured && (
              <div className="mt-6 flex gap-3 border border-terracotta/30 bg-terracotta-50 px-4 py-3.5">
                <AlertCircle size={15} className="mt-0.5 shrink-0 text-terracotta" />
                <p className="text-[11.5px] leading-relaxed text-terracotta">
                  Accounts aren&rsquo;t configured on this deployment.
                  {missingPublicEnv.length > 0 && (
                    <>
                      {" "}
                      Missing{" "}
                      <code className="font-mono">{missingPublicEnv.join(", ")}</code>.
                    </>
                  )}{" "}
                  See <code className="font-mono">SETUP.md</code>. You can still
                  check out as a guest.
                </p>
              </div>
            )}

            {notice && (
              <p className="mt-6 border border-sage/30 bg-sage/10 px-4 py-3 text-[11.5px] leading-relaxed text-sage">
                {notice}
              </p>
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
              <button
                type="button"
                onClick={handleGoogle}
                disabled={pending || !configured}
                className="flex w-full items-center justify-center gap-3 border border-line-strong bg-white px-6 py-4 text-[13.5px] font-medium text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? (
                  <Loader2 size={17} className="animate-spin text-muted" />
                ) : (
                  <GoogleGMark className="h-[18px] w-[18px]" />
                )}
                Continue with Google
              </button>
            </div>

            <form onSubmit={handleEmailSubmit} className="mt-6 space-y-5">
              {mode === "signup" && (
                <label className="block">
                  <span className="eyebrow text-ink-soft">Full name</span>
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    autoComplete="name"
                    placeholder="Amaka Okafor"
                    className={inputClass}
                  />
                </label>
              )}
              <label className="block">
                <span className="eyebrow text-ink-soft">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  placeholder="amaka.okafor@example.com"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="eyebrow text-ink-soft">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  placeholder="At least 6 characters"
                  className={inputClass}
                />
              </label>

              <button
                type="submit"
                disabled={
                  pending ||
                  !configured ||
                  !email ||
                  password.length < 6 ||
                  (mode === "signup" && !fullName.trim())
                }
                className="flex w-full items-center justify-center gap-2 border border-ink px-6 py-4 text-[12px] uppercase tracking-[0.14em] text-ink transition-colors hover:bg-ink hover:text-white disabled:opacity-50"
              >
                {pending ? <Loader2 size={16} className="animate-spin" /> : null}
                {mode === "signin" ? "Sign in with email" : "Create account"}
              </button>
            </form>

            <p className="mt-5 text-[11.5px] text-muted">
              {mode === "signin" ? (
                <>
                  New here?{" "}
                  <Link href={`/signup${searchParams.get("next") ? `?next=${encodeURIComponent(searchParams.get("next")!)}` : ""}`} className="text-ink-soft underline underline-offset-2">
                    Create an account
                  </Link>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signin");
                      setSignInError("");
                      setNotice("");
                    }}
                    className="text-ink-soft underline underline-offset-2"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>

            <Link
              href="/checkout"
              className="eyebrow mt-6 flex items-center justify-center gap-2 py-2 text-muted transition-colors hover:text-ink"
            >
              Continue as a guest
              <ArrowRight size={12} />
            </Link>
          </>
        )}

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

export function LoginPage({ initialMode = "signin" }: { initialMode?: "signin" | "signup" }) {
  return (
    <Suspense
      fallback={
        <div className="px-5 py-32 text-center">
          <p className="eyebrow text-muted">Loading…</p>
        </div>
      }
    >
      <LoginPanel initialMode={initialMode} />
    </Suspense>
  );
}

export default LoginPage;
