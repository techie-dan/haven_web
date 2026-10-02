"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";

/**
 * Route-level error boundary.
 *
 * Note the deliberate wording: we tell the customer no payment was taken,
 * because a crash between "authorise" and "persist" is exactly when someone
 * refreshes and pays twice. `reset()` retries the render; for a failed order
 * the customer should return to the basket instead.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Replace with your error reporter (Sentry, Axiom, …).
    console.error("[app] unhandled error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-5 py-32 text-center">
      <LogoMark className="h-12 w-auto text-ink" />
      <AlertTriangle size={22} strokeWidth={1.4} className="mt-8 text-terracotta" />
      <h1 className="mt-4 font-display text-[32px] font-light leading-tight text-ink">
        Something interrupted the studio.
      </h1>
      <p className="mt-4 text-[13.5px] leading-relaxed text-muted">
        This is on us, not you. If you were completing a purchase,{" "}
        <strong className="font-medium text-ink-soft">
          no payment has been taken
        </strong>{" "}
        — your basket is untouched and you can try again safely.
      </p>

      {error.digest && (
        <p className="mt-4 font-mono text-[11px] text-line-strong">
          Reference: {error.digest}
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="eyebrow bg-ink px-8 py-4 text-white transition-colors hover:bg-terracotta"
        >
          Try again
        </button>
        <Link
          href="/checkout"
          className="eyebrow border border-ink px-8 py-4 text-ink transition-colors hover:bg-ink hover:text-white"
        >
          Return to checkout
        </Link>
      </div>
    </div>
  );
}
