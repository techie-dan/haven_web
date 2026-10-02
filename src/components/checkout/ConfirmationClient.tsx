"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { AlertCircle, ArrowRight, Check, Mail, Package, Truck } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/pricing";

export interface ConfirmationOrder {
  orderNumber: string;
  status: string;
  email: string;
  delivery: string;
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  placedAt: string;
  destination: string;
  emailSent: boolean;
  items: {
    name: string;
    material: string | null;
    imageUrl: string | null;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
  }[];
}

const DELIVERY_LABELS: Record<string, string> = {
  standard_ground: "Standard Insured Ground",
  white_glove: "White Glove Fragile Care & Rapid Dispatch",
  eco_courier: "Eco-Courier Same Day Dispatch",
};

/**
 * Reads the order back from `/api/orders/[orderNumber]`.
 *
 * The order number is a capability (see that route for the reasoning), so this
 * works for guests as well as signed-in customers. If Supabase is not yet
 * configured we still show a confirmation — the order was accepted — but say
 * plainly that we could not load the receipt detail, and never promise an email
 * we cannot verify.
 */
export function ConfirmationClient({ orderNumber }: { orderNumber: string }) {
  const [order, setOrder] = useState<ConfirmationOrder | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/orders/${encodeURIComponent(orderNumber)}`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error(String(response.status));
        const payload = (await response.json()) as ConfirmationOrder;
        if (cancelled) return;
        setOrder(payload);
        setState("ready");
      } catch {
        if (!cancelled) setState("unavailable");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [orderNumber]);

  // `emailSent` is derived server-side from `confirmation_email_sent_at`, so it
  // reports what Mailgun actually did — not merely that it was configured.
  const emailFailed = state === "ready" && order !== null && !order.emailSent;

  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
      {/* Header */}
      <div className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-sage/40 bg-sage/10">
          <Check size={24} strokeWidth={2} className="text-sage" />
        </span>

        <p className="eyebrow mt-7 text-muted">Order {orderNumber}</p>
        <h1 className="mt-3 font-display text-[36px] font-light leading-tight text-ink sm:text-[44px]">
          Thank you — your order is confirmed.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[13.5px] leading-relaxed text-muted">
          Our studio team is preparing your pieces for dispatch. We&rsquo;ll send
          tracking the moment they leave the bench.
        </p>
      </div>

      {/* Email notice — states the real outcome, never an assumption. */}
      <div
        className={cn(
          "mt-10 flex items-start gap-3.5 border px-5 py-4",
          emailFailed
            ? "border-terracotta/30 bg-terracotta-50"
            : "border-line bg-surface",
        )}
      >
        {emailFailed ? (
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-terracotta" />
        ) : (
          <Mail size={16} className="mt-0.5 shrink-0 text-terracotta" />
        )}
        <p className="text-[12.5px] leading-relaxed text-ink-soft">
          {state === "ready" && order ? (
            order.emailSent ? (
              <>
                A confirmation email is on its way
                {order.email ? (
                  <>
                    {" "}
                    to <span className="font-medium text-ink">{order.email}</span>
                  </>
                ) : null}
                . If it hasn&rsquo;t arrived within a few minutes, check your
                spam folder before getting in touch.
              </>
            ) : (
              <>
                Your order is confirmed, but our confirmation email didn&rsquo;t
                go out. Keep your order number
                <span className="font-medium text-ink">
                  {" "}
                  {order.orderNumber}
                </span>{" "}
                and contact the studio if you need a receipt.
              </>
            )
          ) : state === "loading" ? (
            <>Checking where we sent your confirmation email&hellip;</>
          ) : (
            <>
              Your order was accepted. We can&rsquo;t confirm the receipt email
              from this page — keep your order number and get in touch if nothing
              arrives.
            </>
          )}
        </p>
      </div>

      {/* Detail */}
      {state === "loading" && (
        <p className="mt-12 text-center text-[12.5px] text-muted">
          Loading your receipt…
        </p>
      )}

      {state === "unavailable" && (
        <div className="mt-10 border border-line bg-surface-sunk px-6 py-8 text-center">
          <p className="text-[12.5px] leading-relaxed text-muted">
            We couldn&rsquo;t load the full receipt — order records aren&rsquo;t
            connected yet on this deployment. Your order was still accepted; use
            your order number
            <span className="font-medium text-ink"> {orderNumber}</span> as your
            reference.
          </p>
        </div>
      )}

      {state === "ready" && order && (
        <div className="mt-12 border border-line bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-6 py-5">
            <div>
              <p className="eyebrow text-muted">Estimated dispatch</p>
              <p className="mt-1.5 font-display text-[18px] text-ink">
                {DELIVERY_LABELS[order.delivery] ?? order.delivery}
              </p>
            </div>
            {order.destination && (
              <div className="text-right">
                <p className="eyebrow text-muted">Shipping to</p>
                <p className="mt-1.5 text-[13px] text-ink-soft">
                  {order.destination}
                </p>
              </div>
            )}
          </div>

          <ul className="divide-y divide-line px-6">
            {order.items.map((item, index) => (
              <li key={`${item.name}-${index}`} className="flex items-start gap-4 py-5">
                <div className="relative h-[68px] w-[68px] shrink-0 overflow-hidden bg-surface-sunk">
                  {item.imageUrl && (
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      sizes="68px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[15px] leading-snug text-ink">
                    {item.name}
                  </p>
                  {item.material && (
                    <p className="mt-1 text-[11.5px] text-muted">{item.material}</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="tabular font-display text-[14px] text-ink">
                    {formatPrice(item.lineTotalCents)}
                  </p>
                  {item.quantity > 1 && (
                    <p className="tabular mt-1 text-[11px] text-muted">
                      × {item.quantity}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <dl className="space-y-2.5 border-t border-line px-6 py-5 text-[12.5px]">
            <Row label="Subtotal" value={formatPrice(order.subtotalCents)} />
            <Row
              label="Shipping"
              value={
                order.shippingCents === 0 ? (
                  <span className="text-sage">Complimentary</span>
                ) : (
                  formatPrice(order.shippingCents)
                )
              }
            />
            <Row label="Tax" value={formatPrice(order.taxCents)} />
            <div className="!mt-5 flex items-baseline justify-between border-t border-line pt-5">
              <dt className="eyebrow text-ink">Total Paid</dt>
              <dd className="tabular font-display text-[26px] leading-none text-ink">
                {formatPrice(order.totalCents)}
              </dd>
            </div>
          </dl>
        </div>
      )}

      {/* Next steps */}
      <div className="mt-12 grid gap-5 sm:grid-cols-3">
        {[
          {
            icon: Package,
            title: "Prepared by hand",
            body: "Each object is inspected, wrapped in cotton, and cased before it leaves the studio.",
          },
          {
            icon: Truck,
            title: "Tracked dispatch",
            body: "You'll receive a tracking link by email as soon as your parcel is scanned.",
          },
          {
            icon: Check,
            title: "30-day living trial",
            body: "Live with your pieces. Complimentary collection if they don't settle in.",
          },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="border border-line bg-surface-sunk px-5 py-6">
            <Icon size={17} strokeWidth={1.4} className="text-terracotta" />
            <p className="mt-3 text-[12.5px] font-medium text-ink">{title}</p>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
              {body}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/collections/all"
          className="eyebrow flex items-center gap-2 bg-ink px-8 py-4 text-white transition-colors hover:bg-terracotta"
        >
          Continue browsing
          <ArrowRight size={13} />
        </Link>
        <Link
          href="/account"
          className="eyebrow border border-ink px-8 py-4 text-ink transition-colors hover:bg-ink hover:text-white"
        >
          View your orders
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className="tabular text-ink">{value}</dd>
    </div>
  );
}
