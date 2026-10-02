"use client";

import Image from "next/image";
import { useState } from "react";
import { BadgeCheck, RefreshCcw, ShieldCheck, Sparkles } from "lucide-react";
import type { CartLine } from "@/lib/types";
import { formatPrice } from "@/lib/pricing";
import type { Discount } from "@/lib/discounts";

export interface AppliedDiscount {
  code: string;
  description: string;
  amountCents: number;
}

export function OrderSummary({
  lines,
  subtotalCents,
  shippingCents,
  shippingComped,
  taxCents,
  discount,
  discountAmountCents,
  totalCents,
  onApplyDiscount,
}: {
  lines: CartLine[];
  subtotalCents: number;
  shippingCents: number;
  shippingComped: boolean;
  taxCents: number;
  discount: Discount | null;
  discountAmountCents: number;
  totalCents: number;
  onApplyDiscount: (discount: Discount | null, amountCents: number) => void;
}) {
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [checking, setChecking] = useState(false);
  const itemCount = lines.reduce((n, l) => n + l.quantity, 0);

  async function applyCode() {
    const trimmed = code.trim();
    if (!trimmed || checking) return;

    setChecking(true);
    setCodeError("");

    try {
      const response = await fetch("/api/discounts/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed, subtotalCents }),
      });
      const payload = (await response.json()) as {
        valid?: boolean;
        discount?: Discount;
        amountCents?: number;
        error?: string;
      };

      if (!response.ok || !payload.valid || !payload.discount) {
        setCodeError(payload.error ?? "That code isn't recognised.");
        return;
      }

      onApplyDiscount(payload.discount, payload.amountCents ?? 0);
      setCode("");
    } catch {
      setCodeError("Couldn't check that code. Try again.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="lg:sticky lg:top-28">
      <div className="border border-line bg-surface">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <h2 className="font-display text-[22px] text-ink">Order Summary</h2>
          <span className="eyebrow text-muted">
            {itemCount} {itemCount === 1 ? "heritage object" : "heritage objects"}
          </span>
        </div>

        {/* Line items */}
        <ul className="divide-y divide-line px-6">
          {lines.map(({ product, quantity }) => (
            <li key={product.id} className="flex items-start gap-4 py-5">
              <div className="relative h-[70px] w-[70px] shrink-0 overflow-hidden bg-surface-sunk">
                {product.imageUrl && (
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    fill
                    sizes="70px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-[15px] leading-snug text-ink">
                  {product.name}
                </p>
                <p className="mt-1 text-[11.5px] text-muted">
                  {product.material}
                </p>
                {product.artisanNote && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-terracotta" />
                    {product.artisanNote}
                  </p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className="tabular font-display text-[15px] text-ink">
                  {formatPrice(product.priceCents * quantity)}
                </p>
                {quantity > 1 && (
                  <p className="tabular mt-1 text-[11px] text-muted">
                    × {quantity}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>

        {/* Curator code */}
        <div className="border-t border-line px-6 py-5">
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(event) => {
                setCode(event.target.value);
                setCodeError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void applyCode();
                }
              }}
              placeholder="Curator code or gift card"
              aria-label="Curator code or gift card"
              className="min-w-0 flex-1 border border-line bg-canvas px-3.5 py-2.5 text-[12.5px] text-ink placeholder:text-muted focus:border-ink focus:outline-none"
            />
            <button
              type="button"
              onClick={() => void applyCode()}
              disabled={checking || !code.trim()}
              className="eyebrow border border-line px-5 text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:opacity-40"
            >
              {checking ? "…" : "Apply"}
            </button>
          </div>
          {codeError && (
            <p className="mt-2 text-[11px] text-terracotta">{codeError}</p>
          )}
          {discount && (
            <div className="mt-3 flex items-center justify-between gap-3 border border-sage/30 bg-sage/5 px-3 py-2.5">
              <span className="flex items-center gap-2 text-[11.5px] text-sage">
                <BadgeCheck size={13} />
                {discount.code} · {discount.description}
              </span>
              <button
                type="button"
                onClick={() => onApplyDiscount(null, 0)}
                className="eyebrow shrink-0 text-muted transition-colors hover:text-terracotta"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        {/* Totals */}
        <dl className="space-y-2.5 border-t border-line px-6 py-5 text-[12.5px]">
          <Row label="Item Subtotal" value={formatPrice(subtotalCents)} />

          <Row
            label="Selected Shipping"
            value={
              shippingComped ? (
                <span className="text-sage">Complimentary</span>
              ) : (
                formatPrice(shippingCents)
              )
            }
          />

          {discount && discountAmountCents > 0 && (
            <Row
              label={`Discount · ${discount.code}`}
              value={
                <span className="text-sage">
                  −{formatPrice(discountAmountCents)}
                </span>
              }
            />
          )}

          <Row
            label="Estimated Sales Tax"
            value={formatPrice(taxCents)}
            hint="NY State / Kings County"
          />

          <div className="!mt-5 flex items-baseline justify-between border-t border-line pt-5">
            <div>
              <dt className="eyebrow text-ink">Total Investment</dt>
              <dd className="mt-1 text-[11px] text-muted">
                Inclusive of carbon-neutral offset
              </dd>
            </div>
            <span className="tabular font-display text-[30px] leading-none text-ink">
              {formatPrice(totalCents)}
            </span>
          </div>
        </dl>
      </div>

      {/* Guarantees */}
      <ul className="mt-6 space-y-5 border border-line bg-surface px-6 py-6">
        {[
          {
            icon: BadgeCheck,
            title: "30-Day In-Home Trial",
            body: "Live with the objects in your natural home light. Complimentary return pickups if they don't align with your sanctuary.",
          },
          {
            icon: RefreshCcw,
            title: "Broken-In-Transit Replacement Guarantee",
            body: "In the rare event ceramic or glass wares sustain damage, a replacement ships immediately prior to carton inspection.",
          },
          {
            icon: ShieldCheck,
            title: "Conscious Sustainable Logistics",
            body: "100% biodegradable algae-ink print, constarch buffer shells, and paper-adhesive ribbons throughout.",
          },
        ].map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex gap-3.5">
            <Icon
              size={16}
              strokeWidth={1.4}
              className="mt-0.5 shrink-0 text-terracotta"
            />
            <div>
              <p className="text-[12.5px] font-medium leading-snug text-ink">
                {title}
              </p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
                {body}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {/* Pull quote */}
      <blockquote className="mt-6 flex gap-3.5 border border-line bg-surface-sunk px-6 py-6">
        <Sparkles size={15} strokeWidth={1.3} className="mt-1 shrink-0 text-brass" />
        <p className="font-display text-[14px] italic leading-relaxed text-muted">
          &ldquo;Every vessel carries the touch of human hands, shaping space
          with quiet dignity.&rdquo;
        </p>
      </blockquote>
    </div>
  );
}

function Row({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted">
        {label}
        {hint && <span className="ml-1.5 text-[10.5px] text-line-strong">({hint})</span>}
      </dt>
      <dd className="tabular shrink-0 text-ink">{value}</dd>
    </div>
  );
}
