import { cn } from "@/lib/cn";

/**
 * Pay-button marks, drawn inline.
 *
 * Deliberately simplified glyphs rather than licensed brand assets — swap these
 * for the official SVGs from each provider's brand kit before launch.
 */

export function ExpressCheckout() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="eyebrow text-ink">Express Checkout</h2>
        <span className="eyebrow text-muted">Instant Touch Authentication</span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <button
          type="button"
          className="flex h-11 items-center justify-center gap-1.5 bg-[#ffc439] transition-opacity hover:opacity-90"
          aria-label="Check out with PayPal"
        >
          <PayPalMark />
        </button>
        <button
          type="button"
          className="flex h-11 items-center justify-center gap-2 border border-line bg-white transition-colors hover:border-line-strong"
          aria-label="Check out with Google Pay"
        >
          <GoogleGMark className="h-[18px] w-[18px]" />
          <span className="text-[14px] text-[#3c4043]">Pay</span>
        </button>
        <button
          type="button"
          className="flex h-11 items-center justify-center gap-2 bg-[#5a31f4] transition-opacity hover:opacity-90"
          aria-label="Check out with Shop Pay"
        >
          <ShopMark />
        </button>
      </div>

      <div className="mt-5 flex items-center gap-4">
        <span className="h-px flex-1 bg-line" />
        <span className="eyebrow text-muted">Or continue with standard checkout</span>
        <span className="h-px flex-1 bg-line" />
      </div>
    </div>
  );
}

function PayPalMark() {
  return (
    <span className="flex items-center gap-0.5">
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
        <path
          d="M9.1 19.4H6.3l2.6-16h5.3c2.7 0 4.3 1.4 3.9 3.9-.4 2.6-2.4 4.2-5.3 4.2h-1.8l-.7 4.2-.2 1.7z"
          fill="#003087"
        />
        <path
          d="M10.6 21.4H7.8l2.6-16h5.3c2.7 0 4.3 1.4 3.9 3.9-.4 2.6-2.4 4.2-5.3 4.2h-1.8l-.7 4.2-.2 1.7z"
          fill="#009cde"
          fillOpacity="0.85"
        />
      </svg>
      <span className="text-[14px] font-semibold italic text-[#003087]">Pay</span>
    </span>
  );
}

export function GoogleGMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.7-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z"
        fill="#4285F4"
      />
      <path
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.1-4 1.1-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1C3.4 21.4 7.4 24 12 24z"
        fill="#34A853"
      />
      <path
        d="M5.4 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3V6.6H1.4C.5 8.2 0 10 0 12s.5 3.8 1.4 5.4l4-3.1z"
        fill="#FBBC05"
      />
      <path
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0 7.4 0 3.4 2.6 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z"
        fill="#EA4335"
      />
    </svg>
  );
}

function ShopMark() {
  return (
    <span className="flex items-center gap-1.5">
      <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" aria-hidden="true">
        <path
          d="M12 2 4 7v10l8 5 8-5V7l-8-5zm0 2.3 5.9 3.7L12 11.7 6.1 8 12 4.3zM6 9.6l5 3.1v6.2l-5-3.1V9.6zm7 9.3v-6.2l5-3.1v6.2l-5 3.1z"
          fill="#fff"
        />
      </svg>
      <span className="text-[14px] font-semibold text-white">shop</span>
    </span>
  );
}

/** Card-network marks shown beside the payment heading. */
export function CardBrandMarks({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-1.5", className)}>
      {["VISA", "MC", "AMEX", "DISC"].map((brand) => (
        <span
          key={brand}
          className="border border-line px-1.5 py-0.5 text-[8.5px] font-semibold tracking-[0.08em] text-ink-soft"
        >
          {brand}
        </span>
      ))}
    </span>
  );
}
