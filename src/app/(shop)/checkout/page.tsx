import type { Metadata } from "next";
import { Check } from "lucide-react";
import { CheckoutClient } from "@/components/checkout/CheckoutClient";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your Haven Studio & Living order.",
  robots: { index: false, follow: false },
};

const STEPS = [
  { n: 1, label: "Address & Contact", state: "done" as const, note: "Verified" },
  { n: 2, label: "Delivery Method", state: "active" as const, note: "In Progress" },
  { n: 3, label: "Payment & Review", state: "upcoming" as const, note: "Upcoming" },
];

function Stepper() {
  return (
    <ol className="flex flex-wrap items-center gap-x-8 gap-y-4">
      {STEPS.map((step, index) => {
        const done = step.state === "done";
        return (
          <li key={step.n} className="flex items-center gap-4">
            <span className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium",
                  done
                    ? "bg-ink text-white"
                    : step.state === "active"
                      ? "bg-terracotta text-white"
                      : "border border-line-strong text-muted",
                )}
              >
                {done ? <Check size={12} strokeWidth={3} /> : step.n}
              </span>
              <span>
                <span
                  className={cn(
                    "eyebrow block",
                    done
                      ? "text-ink"
                      : step.state === "active"
                        ? "text-ink"
                        : "text-muted",
                  )}
                >
                  {step.n}. {step.label}
                </span>
                <span className="mt-0.5 block text-[11px] text-muted">
                  {step.note}
                </span>
              </span>
            </span>

            {index < STEPS.length - 1 && (
              <span className="hidden h-px w-16 bg-line-strong sm:block" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default function CheckoutPage() {
  return (
    <div className="border-b border-line bg-surface-sunk">
      <div className="border-b border-line bg-canvas">
        <div className="mx-auto max-w-[1400px] px-5 py-7 sm:px-8">
          <Stepper />
        </div>
      </div>

      <div className="pt-10">
        <CheckoutClient />
      </div>
    </div>
  );
}
