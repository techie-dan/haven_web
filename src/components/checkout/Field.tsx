"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Small-caps label + underlined input, matching the checkout comp. */
export function Field({
  label,
  hint,
  error,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="eyebrow flex items-center justify-between text-ink-soft">
        {label}
        {hint && <span className="normal-case tracking-normal text-muted">{hint}</span>}
      </span>
      <input
        {...props}
        aria-invalid={Boolean(error)}
        className={cn(
          "mt-2 w-full border-b bg-transparent pb-2 text-[13.5px] text-ink",
          "placeholder:text-muted focus:outline-none",
          "transition-colors focus:border-ink",
          error ? "border-terracotta" : "border-line-strong",
        )}
      />
      {error && <span className="mt-1.5 block text-[11px] text-terracotta">{error}</span>}
    </label>
  );
}

/** Checkbox row with a serif-free label and optional marker beneath. */
export function CheckRow({
  checked,
  onChange,
  children,
  marker,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  children: ReactNode;
  marker?: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-3.5 w-3.5 shrink-0 cursor-pointer accent-ink"
      />
      <span>
        <span className="block text-[12.5px] leading-relaxed text-ink-soft">
          {children}
        </span>
        {marker && <span className="mt-0.5 block text-[11px] text-muted">{marker}</span>}
      </span>
    </label>
  );
}

/** A numbered checkout step header with an optional right-hand action slot. */
export const CheckoutSection = forwardRef<
  HTMLElement,
  {
    step: number;
    icon: ReactNode;
    title: string;
    description?: string;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
  }
>(function CheckoutSection(
  { step, icon, title, description, action, children, className },
  ref,
) {
  return (
    <section
      ref={ref}
      className={cn("border border-line bg-surface p-6 sm:p-8", className)}
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-3.5">
          <span className="mt-0.5 text-terracotta">{icon}</span>
          <div>
            <h2 className="font-display text-[21px] leading-snug text-ink">
              {title}
            </h2>
            {description && (
              <p className="mt-1.5 max-w-lg text-[12px] leading-relaxed text-muted">
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {action}
          <span className="eyebrow border border-line px-2.5 py-1 text-muted">
            Step {String(step).padStart(2, "0")}
          </span>
        </div>
      </header>

      <div className="mt-6">{children}</div>
    </section>
  );
});
