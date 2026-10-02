/**
 * Curator codes and gift cards.
 *
 * These are *validation* rules, not secrets — the checkout UI holds the applied
 * code as typed state, and `POST /api/orders` re-validates and re-computes the
 * discount server-side. Treat this list as an allowlist, not a security
 * boundary: a customer can read it from the bundle, which is fine because the
 * amount they receive is always recomputed from the real basket total.
 *
 * Move this to a `discounts` table in Supabase when the studio wants to rotate
 * codes without a deploy. Real money-off campaigns should be redeemed exactly
 * once per customer — that needs a database row with a uniqueness constraint.
 */

export interface Discount {
  code: string;
  description: string;
  kind: "percent" | "fixed";
  /** Percent as a whole number (10 = 10%), or cents when kind is "fixed". */
  value: number;
  /** Orders below this subtotal are rejected. */
  minSubtotalCents?: number;
}

const DISCOUNTS: Discount[] = [
  {
    code: "GAZETTE10",
    description: "Gazette subscriber — 10% off",
    kind: "percent",
    value: 10,
  },
  {
    code: "STUDIO25",
    description: "$25 studio credit",
    kind: "fixed",
    value: 2500,
    minSubtotalCents: 10000,
  },
  {
    code: "WELCOME",
    description: "First acquisition — 15% off",
    kind: "percent",
    value: 15,
    minSubtotalCents: 20000,
  },
];

export function findDiscount(code: string): Discount | null {
  return (
    DISCOUNTS.find((d) => d.code === code.trim().toUpperCase()) ?? null
  );
}

/** Discount amount in cents, always clamped to the subtotal. */
export function discountAmountCents(
  discount: Discount,
  subtotalCents: number,
): number {
  if (discount.minSubtotalCents && subtotalCents < discount.minSubtotalCents) {
    return 0;
  }

  const raw =
    discount.kind === "percent"
      ? Math.round((subtotalCents * discount.value) / 100)
      : discount.value;

  return Math.min(raw, subtotalCents);
}
