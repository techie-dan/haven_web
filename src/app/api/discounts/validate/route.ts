import { NextResponse } from "next/server";
import { discountAmountCents, findDiscount } from "@/lib/discounts";

export const runtime = "nodejs";

/**
 * Validates a curator code against the current basket.
 *
 * The client sends only the code and the subtotal it believes it has. The
 * returned amount is advisory — `POST /api/orders` recomputes it from the
 * server-resolved basket, so a tampered subtotal here changes nothing.
 */
export async function POST(request: Request) {
  let body: { code?: unknown; subtotalCents?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const code = typeof body.code === "string" ? body.code : "";
  const subtotalCents =
    typeof body.subtotalCents === "number" && Number.isFinite(body.subtotalCents)
      ? Math.max(0, Math.floor(body.subtotalCents))
      : 0;

  if (!code.trim()) {
    return NextResponse.json({ error: "Enter a code." }, { status: 400 });
  }

  const discount = findDiscount(code);

  // One generic message for both "no such code" and "not eligible" — telling a
  // guesser that a code exists but isn't theirs is a free oracle.
  if (!discount) {
    return NextResponse.json(
      { valid: false, error: "That code isn't recognised." },
      { status: 200 },
    );
  }

  if (
    discount.minSubtotalCents &&
    subtotalCents < discount.minSubtotalCents
  ) {
    return NextResponse.json(
      {
        valid: false,
        error: `Requires a minimum subtotal of $${(discount.minSubtotalCents / 100).toFixed(0)}.`,
      },
      { status: 200 },
    );
  }

  return NextResponse.json({
    valid: true,
    discount,
    amountCents: discountAmountCents(discount, subtotalCents),
  });
}
