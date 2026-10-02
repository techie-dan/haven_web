import {
  deliveryOptions,
  FREE_SHIPPING_THRESHOLD_CENTS,
} from "@/lib/data";
import type {
  CartLine,
  DeliveryKey,
  DeliveryOption,
  OrderTotals,
} from "@/lib/types";

/**
 * Money is stored and computed in integer cents everywhere. Only format at the
 * very edge — never hold a currency amount as a float.
 */

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

/** "$358.00" */
export function formatPrice(cents: number): string {
  return USD.format(cents / 100);
}

/** "$358" when the amount is whole, "$88.50" otherwise — for dense card grids. */
export function formatPriceCompact(cents: number): string {
  return cents % 100 === 0
    ? `$${(cents / 100).toLocaleString("en-US")}`
    : formatPrice(cents);
}

export function lineTotalCents(line: CartLine): number {
  return line.product.priceCents * line.quantity;
}

export function cartSubtotalCents(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + lineTotalCents(line), 0);
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function findDeliveryOption(key: DeliveryKey): DeliveryOption {
  return (
    deliveryOptions.find((option) => option.key === key) ?? deliveryOptions[0]
  );
}

/**
 * Computes the order totals.
 *
 * Shipping is resolved server-side from the delivery key — the client never
 * sends a price. Tax is a flat rate from env until a real tax provider is
 * wired in.
 */
export function computeTotals(
  lines: CartLine[],
  delivery: DeliveryKey,
): OrderTotals {
  const subtotalCents = cartSubtotalCents(lines);
  const option = findDeliveryOption(delivery);

  // Comp the tier when the basket clears the threshold, but never charge a
  // negative amount.
  const qualifiesForFree =
    option.freeOverCents !== undefined &&
    subtotalCents >= Math.min(option.freeOverCents, FREE_SHIPPING_THRESHOLD_CENTS);

  const shippingCents = qualifiesForFree ? 0 : option.priceCents;

  const taxRate = Number(process.env.NEXT_PUBLIC_TAX_RATE ?? "0");
  const taxCents = Number.isFinite(taxRate)
    ? Math.round(subtotalCents * taxRate)
    : 0;

  return {
    subtotalCents,
    shippingCents,
    taxCents,
    totalCents: subtotalCents + shippingCents + taxCents,
    shippingComped: qualifiesForFree && option.priceCents > 0,
  };
}

/** Remaining spend before shipping is comped, or 0 when already qualified. */
export function amountToFreeShipping(subtotalCents: number): number {
  return Math.max(0, FREE_SHIPPING_THRESHOLD_CENTS - subtotalCents);
}

/** Parses "42.50" / "42" into integer cents, or null when unparseable. */
export function parsePriceToCents(value: string): number | null {
  const cleaned = value.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const amount = Number(cleaned);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}
