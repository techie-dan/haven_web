"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  CreditCard,
  Gift,
  Lock,
  MapPin,
  Pencil,
  Truck,
} from "lucide-react";
import type { DeliveryKey, ShippingAddress } from "@/lib/types";
import type { Discount } from "@/lib/discounts";
import { deliveryOptions } from "@/lib/data";
import { cn } from "@/lib/cn";
import { computeTotals, formatPrice } from "@/lib/pricing";
import { useCart } from "@/components/cart/CartProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import { CheckoutSection, CheckRow, Field, Select } from "@/components/checkout/Field";
import { DEFAULT_COUNTRY, NIGERIAN_STATES } from "@/lib/nigeria";
import { CardBrandMarks, ExpressCheckout } from "@/components/checkout/ExpressCheckout";
import { OrderSummary } from "@/components/checkout/OrderSummary";

type PaymentMethod = "card" | "paypal" | "klarna";

const EMPTY_ADDRESS: ShippingAddress = {
  fullName: "",
  email: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: DEFAULT_COUNTRY,
};

export function CheckoutClient() {
  const router = useRouter();
  const { lines, clear, hydrated } = useCart();
  const { user, profile } = useAuth();

  const [address, setAddress] = useState<ShippingAddress>(EMPTY_ADDRESS);
  const [editingContact, setEditingContact] = useState(true);
  const [prefilledProfileId, setPrefilledProfileId] = useState<string | null>(null);
  const [delivery, setDelivery] = useState<DeliveryKey>("white_glove");
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [giftNote, setGiftNote] = useState(false);
  const [payment, setPayment] = useState<PaymentMethod>("card");
  const [discount, setDiscount] = useState<Discount | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const contactRef = useRef<HTMLElement>(null);

  /**
   * Pre-fill from the signed-in customer's saved address.
   *
   * Adjusted during render — React's documented pattern for "reset state when a
   * prop changes" — rather than in an effect, which would cost a second render
   * pass and flash an empty form first. The profile arrives asynchronously
   * after the Google session resolves, so this has to happen after mount rather
   * than in a `useState` initialiser.
   */
  const profileId = user?.id ?? null;
  if (user && profileId !== prefilledProfileId) {
    setPrefilledProfileId(profileId);
    setAddress({
      fullName: profile?.full_name ?? "",
      email: user.email ?? "",
      phone: profile?.phone ?? "",
      line1: profile?.address_line1 ?? "",
      line2: profile?.address_line2 ?? "",
      city: profile?.city ?? "",
      state: profile?.state ?? "",
      postalCode: profile?.postal_code ?? "",
      country: profile?.country ?? DEFAULT_COUNTRY,
    });
    // Only collapse the contact card when the saved address is complete enough
    // to actually ship to.
    if (profile?.address_line1 && profile?.city && profile?.postal_code) {
      setEditingContact(false);
    }
  }

  const totals = useMemo(() => computeTotals(lines, delivery), [lines, delivery]);

  const totalCents = Math.max(0, totals.totalCents - discountAmount);
  const taxCents = Math.round((totals.subtotalCents - discountAmount) * Number(process.env.NEXT_PUBLIC_TAX_RATE ?? "0"));

  function set<K extends keyof ShippingAddress>(key: K, value: string) {
    setAddress((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key as string]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    const required: [keyof ShippingAddress, string][] = [
      ["fullName", "Required"],
      ["email", "Required"],
      ["line1", "Required"],
      ["city", "Required"],
      ["state", "Required"],
    ];

    for (const [key, message] of required) {
      if (!String(address[key]).trim()) next[key] = message;
    }

    if (address.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(address.email)) {
      next.email = "Enter a valid email";
    }

    setErrors(next);

    if (Object.keys(next).length > 0) {
      setEditingContact(true);
      // Wait a tick for the card to expand before scrolling to it.
      window.setTimeout(
        () => contactRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        60,
      );
      return false;
    }

    return true;
  }

  async function placeOrder() {
    if (submitting) return;
    setFormError("");

    if (!validate()) return;

    setSubmitting(true);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Send only ids and quantities — the server re-prices every line from
          // the catalogue and never trusts a client-supplied amount.
          items: lines.map((line) => ({
            productId: line.product.id,
            quantity: line.quantity,
          })),
          address,
          delivery,
          giftNote,
          discountCode: discount?.code ?? null,
          paymentMethod: payment,
        }),
      });

      const payload = (await response.json()) as {
        orderNumber?: string;
        error?: string;
        fieldErrors?: Record<string, string>;
      };

      if (!response.ok || !payload.orderNumber) {
        if (payload.fieldErrors) {
          setErrors(payload.fieldErrors);
          setEditingContact(true);
        }
        setFormError(
          payload.error ??
            "We couldn't place your order. No payment has been taken.",
        );
        return;
      }

      // Order is persisted and the confirmation email is on its way. The basket
      // has done its job.
      clear();
      router.push(`/checkout/confirmation/${payload.orderNumber}`);
    } catch {
      setFormError(
        "We couldn't reach the studio. Check your connection — no payment has been taken.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Wait for localStorage before deciding the basket is empty, otherwise a
  // refresh flashes the empty state.
  if (!hydrated) {
    return (
      <div className="mx-auto max-w-[1400px] px-5 py-24 text-center sm:px-8">
        <p className="eyebrow text-muted">Preparing your basket…</p>
      </div>
    );
  }

  if (lines.length === 0) return <EmptyBasket />;

  return (
    <div className="mx-auto max-w-[1400px] px-5 pb-24 sm:px-8">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-14 xl:grid-cols-[minmax(0,1fr)_440px]">
        {/* ------------------------------ Left column ----------------------- */}
        <div className="space-y-6 lg:pt-2">
          <div className="border border-line bg-surface p-6 sm:p-8">
            <ExpressCheckout />
          </div>

          {/* Step 01 — contact + address */}
          <CheckoutSection
            ref={contactRef}
            step={1}
            icon={<MapPin size={17} strokeWidth={1.5} />}
            title={editingContact ? "Address & Contact" : "Address & Contact"}
            description={
              editingContact
                ? "We use your email for the order confirmation and dispatch tracking. Nothing else, ever."
                : undefined
            }
            action={
              editingContact ? (
                <span className="eyebrow flex items-center gap-1.5 text-sage">
                  <Check size={12} />
                  Verified
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingContact(true)}
                  className="eyebrow flex items-center gap-1.5 border border-line px-3 py-2 text-ink-soft transition-colors hover:border-ink hover:text-ink"
                >
                  <Pencil size={11} />
                  Edit
                </button>
              )
            }
          >
            {editingContact ? (
              <div className="space-y-5">
                {/* Guest checkout is a deliberate, permanent option — signing in
                    speeds checkout up, it is not a toll gate. */}
                {!user && (
                  <div className="flex flex-wrap items-center justify-between gap-3 border border-line bg-surface-sunk px-4 py-3">
                    <p className="text-[12px] text-muted">
                      Sign in to pre-fill your address and track orders.
                    </p>
                    <Link
                      href="/login?next=/checkout"
                      className="eyebrow text-terracotta underline underline-offset-4"
                    >
                      Continue with Google
                    </Link>
                  </div>
                )}

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    label="Full Name"
                    value={address.fullName}
                    onChange={(event) => set("fullName", event.target.value)}
                    error={errors.fullName}
                    autoComplete="name"
                    placeholder="Amaka Okafor"
                  />
                  <Field
                    label="Email Address"
                    type="email"
                    value={address.email}
                    onChange={(event) => set("email", event.target.value)}
                    error={errors.email}
                    autoComplete="email"
                    placeholder="amaka.okafor@example.com"
                  />
                </div>

                <Field
                  label="Phone"
                  hint="For courier coordination"
                  type="tel"
                  value={address.phone}
                  onChange={(event) => set("phone", event.target.value)}
                  autoComplete="tel"
                  placeholder="+234 803 123 4567"
                />

                <Field
                  label="Street Address"
                  value={address.line1}
                  onChange={(event) => set("line1", event.target.value)}
                  error={errors.line1}
                  autoComplete="address-line1"
                  placeholder="12B Admiralty Way"
                />

                <Field
                  label="Apartment, Suite, Floor"
                  hint="Optional"
                  value={address.line2}
                  onChange={(event) => set("line2", event.target.value)}
                  autoComplete="address-line2"
                  placeholder="Flat 3"
                />

                <div className="grid gap-5 sm:grid-cols-3">
                  <Field
                    label="City"
                    value={address.city}
                    onChange={(event) => set("city", event.target.value)}
                    error={errors.city}
                    autoComplete="address-level2"
                    placeholder="Lekki"
                  />
                  <Select
                    label="State"
                    value={address.state}
                    onChange={(event) => set("state", event.target.value)}
                    error={errors.state}
                    options={NIGERIAN_STATES}
                  />
                  <Field
                    label="Postal Code"
                    hint="Optional"
                    value={address.postalCode}
                    onChange={(event) => set("postalCode", event.target.value)}
                    error={errors.postalCode}
                    autoComplete="postal-code"
                    placeholder="106104"
                  />
                </div>

                <Field
                  label="Country"
                  value={address.country}
                  onChange={(event) => set("country", event.target.value)}
                  autoComplete="country-name"
                />

                <button
                  type="button"
                  onClick={() => {
                    if (validate()) setEditingContact(false);
                  }}
                  className="eyebrow flex items-center gap-2 bg-ink px-7 py-3.5 text-white transition-colors hover:bg-terracotta"
                >
                  Confirm &amp; continue
                  <ArrowRight size={13} />
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-start gap-4 border border-line bg-surface-sunk px-5 py-4">
                <span className="eyebrow mt-0.5 shrink-0 border border-sage/40 bg-sage/10 px-2.5 py-1 text-sage">
                  Step 01 Completed
                </span>
                <address className="flex-1 text-[12.5px] not-italic leading-relaxed text-ink-soft">
                  <span className="block font-medium text-ink">
                    {address.fullName}
                  </span>
                  <span className="block">{address.email}</span>
                  {address.phone && <span className="block">{address.phone}</span>}
                  <span className="mt-1 block">
                    {[
                      address.line1,
                      address.line2,
                      `${address.city}, ${address.state} ${address.postalCode}`,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </address>
              </div>
            )}
          </CheckoutSection>

          {/* Step 02 — delivery */}
          <CheckoutSection
            step={2}
            icon={<Truck size={17} strokeWidth={1.5} />}
            title="Select Delivery Method"
            description="All shipments depart in recyclable honeycomb pulp cartons with museum-grade shock-absorbent suspension."
          >
            <fieldset className="space-y-2.5">
              <legend className="sr-only">Delivery method</legend>
              {deliveryOptions.map((option) => {
                const active = delivery === option.key;
                const comped =
                  option.freeOverCents !== undefined &&
                  totals.subtotalCents >= option.freeOverCents;

                return (
                  <label
                    key={option.key}
                    className={cn(
                      "flex cursor-pointer items-start gap-3.5 border px-5 py-4 transition-colors",
                      active
                        ? "border-terracotta bg-terracotta-50"
                        : "border-line bg-surface hover:border-line-strong",
                    )}
                  >
                    <input
                      type="radio"
                      name="delivery"
                      value={option.key}
                      checked={active}
                      onChange={() => setDelivery(option.key)}
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 cursor-pointer accent-terracotta"
                    />
                    <span className="flex-1">
                      <span className="flex flex-wrap items-center gap-2.5">
                        <span className="text-[13px] font-medium text-ink">
                          {option.name}
                        </span>
                        {option.recommended && (
                          <span className="eyebrow bg-terracotta px-2 py-0.5 text-white">
                            Recommended
                          </span>
                        )}
                      </span>
                      <span className="mt-1 block text-[12px] text-muted">
                        {option.blurb}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "eyebrow shrink-0 pt-0.5",
                        comped ? "text-terracotta" : "text-ink",
                      )}
                    >
                      {comped ? "Complimentary" : formatPrice(option.priceCents)}
                    </span>
                  </label>
                );
              })}
            </fieldset>

            {totals.shippingComped && (
              <p className="mt-4 flex items-center gap-2 text-[11.5px] text-sage">
                <Check size={13} />
                Your basket cleared {formatPrice(15000)} — ground delivery is on us.
              </p>
            )}
          </CheckoutSection>

          {/* Step 03 — payment */}
          <CheckoutSection
            step={3}
            icon={<CreditCard size={17} strokeWidth={1.5} />}
            title="Payment Architecture"
            action={<CardBrandMarks className="hidden sm:flex" />}
          >
            {/* Payment method tabs */}
            <div className="grid grid-cols-3 border border-line">
              {(
                [
                  { key: "card", label: "Credit Card" },
                  { key: "paypal", label: "PayPal" },
                  { key: "klarna", label: "Pay in 4 (Klarna)" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setPayment(tab.key)}
                  className={cn(
                    "eyebrow py-3.5 transition-colors",
                    payment === tab.key
                      ? "bg-surface text-ink"
                      : "bg-surface-sunk text-muted hover:text-ink-soft",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {payment === "card" ? (
              <div className="mt-6 space-y-5">
                <Field
                  label="Cardholder Name"
                  defaultValue={address.fullName}
                  autoComplete="cc-name"
                  placeholder="Elena Lindqvist"
                />
                <Field
                  label="Card Number"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  placeholder="4242 •••• •••• 9018"
                />
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    label="Expiration (MM / YY)"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    placeholder="10 / 28"
                  />
                  <Field
                    label="Security Code (CVC)"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    placeholder="•••"
                  />
                </div>

                <div className="border border-line bg-surface-sunk px-4 py-3.5">
                  <p className="flex items-start gap-2.5 text-[11.5px] leading-relaxed text-muted">
                    <Lock size={13} className="mt-0.5 shrink-0 text-sage" />
                    <span>
                      <strong className="font-medium text-ink-soft">
                        No card data touches our servers.
                      </strong>{" "}
                      This build wires the payment step to a placeholder — connect
                      a PCI-compliant provider (Kora, Stripe, or Paystack) in{" "}
                      <code className="rounded bg-surface px-1 py-0.5 font-mono text-[10.5px]">
                        POST /api/orders
                      </code>{" "}
                      before going live. Orders are recorded as{" "}
                      <code className="rounded bg-surface px-1 py-0.5 font-mono text-[10.5px]">
                        pending
                      </code>{" "}
                      until then.
                    </span>
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-6 border border-line bg-surface-sunk px-5 py-8 text-center text-[12.5px] leading-relaxed text-muted">
                You&rsquo;ll be redirected to{" "}
                {payment === "paypal" ? "PayPal" : "Klarna"} to authorise payment
                after reviewing your order.
              </p>
            )}

            <div className="mt-6 space-y-4 border-t border-line pt-6">
              <CheckRow
                checked={sameAsShipping}
                onChange={setSameAsShipping}
                marker={
                  sameAsShipping
                    ? `${address.line1}${address.city ? `, ${address.city}` : ""}`
                    : undefined
                }
              >
                Billing address is identical to shipping destination
              </CheckRow>

              <CheckRow checked={giftNote} onChange={setGiftNote}>
                <span className="flex items-center gap-2">
                  <Gift size={13} className="text-terracotta" />
                  Include handwritten gift note &amp; unbleached cotton wrap
                  (Complimentary)
                </span>
                <span className="mt-0.5 block text-[11px] text-muted">
                  Invoices are sent digitally and omitted from package interior
                </span>
              </CheckRow>
            </div>

            {formError && (
              <p
                role="alert"
                className="mt-6 border border-terracotta/30 bg-terracotta-50 px-4 py-3 text-[12px] leading-relaxed text-terracotta"
              >
                {formError}
              </p>
            )}

            <button
              type="button"
              onClick={() => void placeOrder()}
              disabled={submitting}
              className="eyebrow mt-7 flex w-full items-center justify-center gap-2.5 bg-ink py-4 text-white transition-colors hover:bg-terracotta disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Lock size={14} />
              {submitting
                ? "Authorising…"
                : `Authorize & Place Order — ${formatPrice(totalCents)}`}
            </button>

            <p className="mt-3.5 text-center text-[11px] leading-relaxed text-muted">
              By placing your order, you agree to Haven Studio&rsquo;s{" "}
              <Link href="/terms-of-commission" className="text-ink-soft underline underline-offset-2">
                Terms of Commission
              </Link>{" "}
              and{" "}
              <Link href="/privacy-policy" className="text-ink-soft underline underline-offset-2">
                Privacy Protocol
              </Link>
              . Charges appear as HAVEN*STUDIO NY.
            </p>
          </CheckoutSection>
        </div>

        {/* ------------------------------ Right column ---------------------- */}
        <div className="lg:pt-2">
          <OrderSummary
            lines={lines}
            subtotalCents={totals.subtotalCents}
            shippingCents={totals.shippingCents}
            shippingComped={totals.shippingComped}
            taxCents={taxCents}
            discount={discount}
            discountAmountCents={discountAmount}
            totalCents={totalCents}
            onApplyDiscount={(next, amount) => {
              setDiscount(next);
              setDiscountAmount(amount);
            }}
          />
        </div>
      </div>
    </div>
  );
}

function EmptyBasket() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-5 px-5 py-28 text-center">
      <h1 className="font-display text-[30px] text-ink">Your basket is empty</h1>
      <p className="text-[13.5px] leading-relaxed text-muted">
        Nothing to check out just yet. Every piece in the studio is made in small
        batches — begin with the collection.
      </p>
      <Link
        href="/collections/all"
        className="eyebrow mt-2 bg-ink px-8 py-4 text-white transition-colors hover:bg-terracotta"
      >
        Browse the collection
      </Link>
    </div>
  );
}
