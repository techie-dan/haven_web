import { NextResponse } from "next/server";
import { getProducts } from "@/lib/catalog";
import { computeTotals, findDeliveryOption } from "@/lib/pricing";
import { discountAmountCents, findDiscount } from "@/lib/discounts";
import { isMailgunConfigured, sendEmail } from "@/lib/mailgun";
import { orderConfirmationEmail, studioNotificationEmail } from "@/lib/emails";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import {
  fieldErrorsFrom,
  placeOrderSchema,
} from "@/lib/validation";
import type { CartLine } from "@/lib/types";

export const runtime = "nodejs";

/**
 * The mobile app calls this endpoint from a native fetch and, when run through
 * Expo's web target, from a localhost origin. Bearer auth is used instead of
 * cookies there, so allow both.
 */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * Places an order.
 *
 * Trust model: the client sends product ids, quantities and an address — never
 * a price. Every amount is recomputed here against the server's catalogue, so a
 * tampered basket cannot change what is charged.
 *
 * Order of operations, deliberately:
 *   1. Validate the payload.
 *   2. Re-price from the catalogue.
 *   3. Persist the order (if Supabase is configured).
 *   4. Send the confirmation email.
 * A failure at step 4 must not lose the order, and a failure at step 3 must not
 * lose the sale — the customer gets a confirmation either way and the studio
 * gets a loud error in the logs.
 */
export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Malformed request." },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const parsed = placeOrderSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Please check the highlighted fields.",
        fieldErrors: fieldErrorsFrom(parsed.error),
      },
      { status: 422, headers: CORS_HEADERS },
    );
  }

  const { items, address, delivery, giftNote, discountCode, paymentMethod } =
    parsed.data;

  // ---- 2. Re-price from the server's catalogue -----------------------------
  const catalogue = await getProducts();
  const lines: CartLine[] = [];

  for (const item of items) {
    const product = catalogue.find((p) => p.id === item.productId);

    if (!product) {
      return NextResponse.json(
        {
          error:
            "One of the pieces in your basket is no longer available. Please review your basket and try again.",
        },
        { status: 409, headers: CORS_HEADERS },
      );
    }

    if (!product.inStock) {
      return NextResponse.json(
        { error: `"${product.name}" has sold out. Please remove it to continue.` },
        { status: 409, headers: CORS_HEADERS },
      );
    }

    lines.push({ product, quantity: item.quantity });
  }

  const totals = computeTotals(lines, delivery);

  const discount = discountCode ? findDiscount(discountCode) : null;
  const discountAmount =
    discount && (!discount.minSubtotalCents || totals.subtotalCents >= discount.minSubtotalCents)
      ? discountAmountCents(discount, totals.subtotalCents)
      : 0;

  // Discount applies to goods only — never to shipping or tax.
  const taxableBase = Math.max(0, totals.subtotalCents - discountAmount);
  const taxRate = Number(process.env.NEXT_PUBLIC_TAX_RATE ?? "0");
  const taxCents = Number.isFinite(taxRate) ? Math.round(taxableBase * taxRate) : 0;
  const totalCents = Math.max(
    0,
    totals.subtotalCents + totals.shippingCents + taxCents - discountAmount,
  );

  const placedAt = new Date();

  // ---- 3. Persist ----------------------------------------------------------
  // Provisional reference, used when Supabase is unconfigured so the customer
  // still leaves with one. A persisted order is re-numbered from the database
  // sequence before it is written.
  let orderNumber = `HVN-${placedAt.getFullYear()}-${String(
    Math.floor(Math.random() * 9000) + 1000,
  )}`;
  let persisted = false;
  let userId: string | null = null;

  // Link the order to the signed-in customer, if there is one. The website
  // authenticates with cookies; the mobile app has no cookie jar and sends its
  // Supabase access token as a bearer header, so accept either.
  try {
    const supabase = await createClient();
    const authHeader = request.headers.get("authorization");
    const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const {
      data: { user },
    } = bearer ? await supabase.auth.getUser(bearer) : await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    // Supabase unconfigured or unreachable — proceed as a guest order.
  }

  if (isAdminConfigured) {
    try {
      const admin = createAdminClient();

      // Order numbers come from `order_number_seq`, created alongside the orders
      // table in 0001_init.sql — so this RPC is exactly as available as the table
      // it writes to. A missing function degrades to the provisional number above
      // rather than losing the sale.
      const { data: sequenced, error: sequenceError } = await admin.rpc(
        "next_order_number",
      );

      if (sequenceError) {
        console.error(
          "[orders] next_order_number() unavailable — using a provisional order number:",
          sequenceError,
        );
      } else if (typeof sequenced === "string" && sequenced.length > 0) {
        orderNumber = sequenced;
      }

      const { data: created, error: orderError } = await admin
        .from("orders")
        .insert({
          order_number: orderNumber,
          user_id: userId,
          email: address.email,
          status: "pending",
          shipping_name: address.fullName,
          shipping_line1: address.line1,
          shipping_line2: address.line2 || null,
          shipping_city: address.city,
          shipping_state: address.state,
          shipping_postal: address.postalCode,
          shipping_country: address.country,
          shipping_phone: address.phone || null,
          delivery,
          delivery_cents: totals.shippingCents,
          gift_note_requested: giftNote ?? false,
          subtotal_cents: totals.subtotalCents,
          shipping_cents: totals.shippingCents,
          tax_cents: taxCents,
          total_cents: totalCents,
          payment_provider: paymentMethod,
          notes: discount
            ? `Discount ${discount.code} applied: −${(discountAmount / 100).toFixed(2)}`
            : null,
        })
        .select("id, order_number")
        .single();

      if (orderError) throw orderError;

      orderNumber = created.order_number;
      persisted = true;

      const { error: itemsError } = await admin.from("order_items").insert(
        lines.map((line) => ({
          order_id: created.id,
          product_id: line.product.id,
          product_name: line.product.name,
          product_slug: line.product.slug,
          material: line.product.material,
          variant_note: line.product.artisanNote,
          image_url: line.product.imageUrl,
          unit_price_cents: line.product.priceCents,
          quantity: line.quantity,
          line_total_cents: line.product.priceCents * line.quantity,
        })),
      );

      // The order itself is already committed; a failed item insert is a data
      // problem to fix, not a reason to fail the customer's checkout.
      if (itemsError) {
        console.error(
          `[orders] order ${orderNumber} persisted but order_items failed:`,
          itemsError,
        );
      }
    } catch (error) {
      console.error("[orders] could not persist order:", error);
    }
  } else {
    console.warn(
      "[orders] SUPABASE_SERVICE_ROLE_KEY not set — order not persisted. " +
        `Order ${orderNumber} for ${address.email}, total ${(totalCents / 100).toFixed(2)}.`,
    );
  }

  // ---- 4. Email ------------------------------------------------------------
  const emailData = {
    orderNumber,
    lines,
    delivery,
    address,
    totals: {
      subtotalCents: totals.subtotalCents,
      shippingCents: totals.shippingCents,
      taxCents,
      totalCents,
      shippingComped: totals.shippingComped,
    },
    giftNote: giftNote ?? false,
    placedAt,
  };

  // Whether the customer's confirmation actually left — not merely whether
  // Mailgun is configured. The confirmation page reads this.
  let emailSent = false;

  if (isMailgunConfigured()) {
    const confirmation = orderConfirmationEmail(emailData);
    const studio = studioNotificationEmail(emailData);
    const studioInbox = process.env.STUDIO_NOTIFICATION_EMAIL;

    // Fire both in parallel; neither should block the other.
    const [customerResult, studioResult] = await Promise.all([
      sendEmail({
        to: address.email,
        subject: confirmation.subject,
        html: confirmation.html,
        text: confirmation.text,
        tags: ["order-confirmation"],
        variables: { orderNumber },
      }),
      studioInbox
        ? sendEmail({
            to: studioInbox,
            subject: studio.subject,
            html: studio.html,
            text: studio.text,
            tags: ["studio-notification"],
            variables: { orderNumber },
          })
        : Promise.resolve({ ok: true as const }),
    ]);

    emailSent = customerResult.ok;

    if (!customerResult.ok) {
      console.error(
        `[orders] confirmation email failed for ${orderNumber}:`,
        customerResult.error,
      );
    } else if (persisted && customerResult.id) {
      // Best-effort bookkeeping — the customer already has their email.
      try {
        const admin = createAdminClient();
        await admin
          .from("orders")
          .update({
            confirmation_email_id: customerResult.id,
            confirmation_email_sent_at: new Date().toISOString(),
          })
          .eq("order_number", orderNumber);
      } catch (error) {
        console.error("[orders] could not record email id:", error);
      }
    }

    if (!studioResult.ok) {
      console.error(
        `[orders] studio notification failed for ${orderNumber}:`,
        studioResult.error,
      );
    }
  } else {
    console.warn(
      `[orders] Mailgun not configured — no confirmation sent for ${orderNumber}.`,
    );
  }

  return NextResponse.json(
    {
      orderNumber,
      totalCents,
      email: address.email,
      persisted,
      // The outcome of the send itself, so the confirmation page never promises
      // an email Mailgun rejected.
      emailSent,
      deliveryName: findDeliveryOption(delivery).name,
    },
    { status: 201, headers: CORS_HEADERS },
  );
}
