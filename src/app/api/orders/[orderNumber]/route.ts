import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminConfigured } from "@/lib/config";

export const runtime = "nodejs";

/**
 * Order lookup for the confirmation page.
 *
 * ## Why this is not simply an RLS read
 *
 * `orders` is protected by a policy that only exposes a row to its owner — but
 * most checkouts here are **guest** checkouts, and a guest has no session to
 * match against. The confirmation page therefore has to be readable by someone
 * who is not the row's owner.
 *
 * ## What protects it instead
 *
 * The order number is the capability: `HVN-2026-0001` format, sequence-backed,
 * and never listed anywhere public. That is the same trade-off every
 * "check your order status" page makes, and it is strengthened here by:
 *
 *   - Returning a deliberately narrow projection. No full postal address, no
 *     phone number, and the email is masked to `e***a@example.com`. Enough to
 *     confirm "this is my order", not enough to be a data dump.
 *   - A tight rate limit per IP, so the sequence cannot be walked. The numbers
 *     are sequential, so without this an attacker could enumerate every order.
 *
 * If you would rather not rely on that, the alternates are: (a) email a
 * one-time link and drop this route entirely, or (b) require sign-in before
 * checkout. (a) is the stronger design and a small change — the order
 * confirmation email already contains the order number.
 */

const ORDER_RE = /^HVN-\d{4}-\d{4,}$/;

/** Simple in-process rate limiter: N lookups per IP per window. */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);

  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count += 1;

  // Opportunistic cleanup so the map does not grow unbounded.
  if (hits.size > 5_000) {
    for (const [key, value] of hits) {
      if (now > value.resetAt) hits.delete(key);
    }
  }

  return entry.count > MAX_PER_WINDOW;
}

/** "elena.lindqvist@havenstudio.com" → "e•••••t@havenstudio.com" */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "•••";
  if (local.length <= 2) return `${local[0] ?? "•"}•••@${domain}`;
  return `${local[0]}${"•".repeat(Math.min(6, local.length - 2))}${local[local.length - 1]}@${domain}`;
}

interface OrderItemRow {
  product_name: string;
  material: string | null;
  image_url: string | null;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderNumber: string }> },
) {
  const { orderNumber } = await params;

  if (!ORDER_RE.test(orderNumber)) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many lookups. Please wait a moment." },
      { status: 429 },
    );
  }

  if (!isAdminConfigured) {
    return NextResponse.json(
      { error: "Order lookup is not configured." },
      { status: 503 },
    );
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("orders")
      .select(
        "order_number, status, email, delivery, subtotal_cents, shipping_cents, " +
          "tax_cents, total_cents, created_at, shipping_city, shipping_state, " +
          "shipping_country, confirmation_email_sent_at, " +
          "order_items ( product_name, material, image_url, quantity, unit_price_cents, line_total_cents )",
      )
      .eq("order_number", orderNumber)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const record = data as unknown as {
      order_number: string;
      status: string;
      email: string;
      delivery: string;
      subtotal_cents: number;
      shipping_cents: number;
      tax_cents: number;
      total_cents: number;
      created_at: string;
      shipping_city: string | null;
      shipping_state: string | null;
      shipping_country: string | null;
      confirmation_email_sent_at: string | null;
      order_items: OrderItemRow[];
    };

    return NextResponse.json({
      orderNumber: record.order_number,
      status: record.status,
      // Masked — see the note above.
      email: maskEmail(record.email),
      delivery: record.delivery,
      subtotalCents: record.subtotal_cents,
      shippingCents: record.shipping_cents,
      taxCents: record.tax_cents,
      totalCents: record.total_cents,
      placedAt: record.created_at,
      destination: [record.shipping_city, record.shipping_state, record.shipping_country]
        .filter(Boolean)
        .join(", "),
      emailSent: Boolean(record.confirmation_email_sent_at),
      items: (record.order_items ?? []).map((item) => ({
        name: item.product_name,
        material: item.material,
        imageUrl: item.image_url,
        quantity: item.quantity,
        unitPriceCents: item.unit_price_cents,
        lineTotalCents: item.line_total_cents,
      })),
    });
  } catch (error) {
    console.error("[orders] lookup failed:", error);
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
}
