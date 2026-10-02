import "server-only";

import { formatPrice } from "@/lib/pricing";
import type { CartLine, DeliveryKey, ShippingAddress } from "@/lib/types";
import { findDeliveryOption } from "@/lib/pricing";

/**
 * Transactional email templates.
 *
 * Written as plain template functions returning a { html, text } pair — no
 * framework, no build step. Inline styles only: email clients strip <style>
 * blocks and have no support for modern CSS, so everything is table-based with
 * style attributes.
 */

export interface OrderEmailData {
  orderNumber: string;
  lines: CartLine[];
  delivery: DeliveryKey;
  address: ShippingAddress;
  totals: {
    subtotalCents: number;
    shippingCents: number;
    taxCents: number;
    totalCents: number;
    shippingComped: boolean;
  };
  giftNote?: boolean;
  placedAt: Date;
}

const INK = "#1c1a17";
const MUTED = "#8c8579";
const LINE = "#e2ddd4";
const CANVAS = "#f4f1ec";
const TERRACOTTA = "#c1613c";

/** Shared shell so both emails stay visually identical. */
function shell(body: string, previewText: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>Haven Studio &amp; Living</title>
</head>
<body style="margin:0;padding:0;background:${CANVAS};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${previewText}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CANVAS};padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid ${LINE};">

      <!-- Wordmark -->
      <tr><td style="padding:36px 40px 28px;border-bottom:1px solid ${LINE};text-align:center;">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;letter-spacing:0.28em;color:${INK};text-transform:uppercase;">HAVEN</div>
        <div style="font-family:Helvetica,Arial,sans-serif;font-size:9px;letter-spacing:0.34em;color:${MUTED};text-transform:uppercase;margin-top:6px;">Studio &amp; Living</div>
      </td></tr>

      ${body}

      <!-- Footer -->
      <tr><td style="padding:28px 40px 36px;border-top:1px solid ${LINE};">
        <p style="margin:0 0 10px;font-family:Helvetica,Arial,sans-serif;font-size:11px;line-height:1.7;color:${MUTED};text-align:center;">
          Questions about this order? Reply to this email — a person reads it.
        </p>
        <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:0.08em;color:#b3aca1;text-align:center;text-transform:uppercase;">
          Haven Studio &amp; Living · 482 Greene Ave · Brooklyn, NY 11216
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function lineRows(lines: CartLine[]): string {
  return lines
    .map(({ product, quantity }) => {
      const thumb = product.imageUrl
        ? `<img src="${product.imageUrl}" width="64" height="64" alt="" style="display:block;width:64px;height:64px;object-fit:cover;border:1px solid ${LINE};">`
        : "";

      return `<tr>
        <td width="64" valign="top" style="padding:0 14px 18px 0;">${thumb}</td>
        <td valign="top" style="padding:0 0 18px;">
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:15px;color:${INK};line-height:1.35;">${escapeHtml(product.name)}</div>
          <div style="font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:${MUTED};margin-top:5px;">
            ${escapeHtml(product.material)}${quantity > 1 ? ` &nbsp;·&nbsp; Qty ${quantity}` : ""}
          </div>
          ${product.artisanNote ? `<div style="font-family:Helvetica,Arial,sans-serif;font-size:11px;color:${MUTED};margin-top:4px;">${escapeHtml(product.artisanNote)}</div>` : ""}
        </td>
        <td valign="top" align="right" style="padding:0 0 18px;font-family:Helvetica,Arial,sans-serif;font-size:14px;color:${INK};font-variant-numeric:tabular-nums;white-space:nowrap;">
          ${formatPrice(product.priceCents * quantity)}
        </td>
      </tr>`;
    })
    .join("");
}

function totalRow(label: string, value: string, strong = false): string {
  const size = strong ? "16px" : "13px";
  const color = strong ? INK : MUTED;
  const weight = strong ? "600" : "400";
  return `<tr>
    <td style="padding:${strong ? "12px 0 0" : "7px 0 0"};font-family:Helvetica,Arial,sans-serif;font-size:${size};font-weight:${weight};color:${color};">${label}</td>
    <td align="right" style="padding:${strong ? "12px 0 0" : "7px 0 0"};font-family:Helvetica,Arial,sans-serif;font-size:${size};font-weight:${weight};color:${color};font-variant-numeric:tabular-nums;">${value}</td>
  </tr>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function addressBlock(address: ShippingAddress): string {
  const parts = [
    address.line1,
    address.line2,
    `${address.city}, ${address.state} ${address.postalCode}`,
    address.country,
  ].filter(Boolean);

  return parts.map(escapeHtml).join("<br>");
}

// ---------------------------------------------------------------------------
// Customer confirmation
// ---------------------------------------------------------------------------

export function orderConfirmationEmail(data: OrderEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const { orderNumber, lines, delivery, address, totals, giftNote, placedAt } =
    data;
  const option = findDeliveryOption(delivery);

  const eta = new Date(placedAt);
  eta.setDate(
    eta.getDate() + (delivery === "white_glove" ? 2 : delivery === "eco_courier" ? 0 : 5),
  );
  const etaLabel = eta.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const shippingLabel =
    totals.shippingCents === 0
      ? totals.shippingComped
        ? "COMPLIMENTARY"
        : "Included"
      : formatPrice(totals.shippingCents);

  const body = `
    <tr><td style="padding:36px 40px 8px;">
      <p style="margin:0 0 14px;font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${MUTED};">
        Order ${escapeHtml(orderNumber)}
      </p>
      <h1 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:400;line-height:1.2;color:${INK};">
        Thank you, ${escapeHtml(address.fullName.split(" ")[0] || "friend")}.
      </h1>
      <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.7;color:#4a453e;">
        Your order is confirmed and our studio team is preparing it for dispatch.
        We'll send tracking the moment it leaves the bench.
      </p>
    </td></tr>

    <tr><td style="padding:26px 40px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CANVAS};border:1px solid ${LINE};">
        <tr><td style="padding:16px 18px;">
          <div style="font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${MUTED};">Estimated arrival</div>
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:17px;color:${INK};margin-top:5px;">${etaLabel}</div>
          <div style="font-family:Helvetica,Arial,sans-serif;font-size:12px;color:${MUTED};margin-top:4px;">${escapeHtml(option.name)}</div>
        </td></tr>
      </table>
    </td></tr>

    <tr><td style="padding:32px 40px 0;">
      <div style="font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${MUTED};padding-bottom:16px;border-bottom:1px solid ${LINE};">
        Your pieces
      </div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding-top:18px;">
        ${lineRows(lines)}
      </table>
    </td></tr>

    <tr><td style="padding:4px 40px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${LINE};">
        ${totalRow("Subtotal", formatPrice(totals.subtotalCents))}
        ${totalRow("Shipping", shippingLabel)}
        ${totalRow("Estimated tax", formatPrice(totals.taxCents))}
        ${totalRow("Total", formatPrice(totals.totalCents), true)}
      </table>
    </td></tr>

    ${
      giftNote
        ? `<tr><td style="padding:24px 40px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fbf3ef;border:1px solid #f0dbd0;">
              <tr><td style="padding:14px 16px;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#8a4a2c;">
                We've tucked in a handwritten note on unbleached cotton wrap. The invoice is digital only.
              </td></tr>
            </table>
          </td></tr>`
        : ""
    }

    <tr><td style="padding:32px 40px 0;">
      <div style="font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${MUTED};padding-bottom:14px;border-bottom:1px solid ${LINE};">
        Shipping to
      </div>
      <p style="margin:16px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.75;color:#4a453e;">
        ${escapeHtml(address.fullName)}<br>
        ${addressBlock(address)}
        ${address.phone ? `<br>${escapeHtml(address.phone)}` : ""}
      </p>
    </td></tr>

    <tr><td style="padding:32px 40px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${LINE};">
        <tr><td style="padding:18px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:14px;font-style:italic;line-height:1.7;color:${MUTED};">
          &ldquo;Every vessel carries the touch of human hands, shaping space with quiet dignity.&rdquo;
        </td></tr>
      </table>
    </td></tr>
  `;

  const text = [
    `HAVEN STUDIO & LIVING`,
    `Order ${orderNumber}`,
    ``,
    `Thank you, ${address.fullName.split(" ")[0] || "friend"}.`,
    `Your order is confirmed. Estimated arrival: ${etaLabel} (${option.name}).`,
    ``,
    `YOUR PIECES`,
    ...lines.map(
      ({ product, quantity }) =>
        `  ${quantity} × ${product.name} — ${formatPrice(product.priceCents * quantity)}`,
    ),
    ``,
    `Subtotal:      ${formatPrice(totals.subtotalCents)}`,
    `Shipping:      ${shippingLabel}`,
    `Estimated tax: ${formatPrice(totals.taxCents)}`,
    `TOTAL:         ${formatPrice(totals.totalCents)}`,
    ``,
    `SHIPPING TO`,
    address.fullName,
    ...addressBlock(address).split("<br>").map((l) => l.replace(/&amp;/g, "&")),
    ``,
    `Questions? Reply to this email — a person reads it.`,
  ].join("\n");

  return {
    subject: `Order ${orderNumber} confirmed — Haven Studio & Living`,
    html: shell(
      body,
      `Your order ${orderNumber} is confirmed. Estimated arrival ${etaLabel}.`,
    ),
    text,
  };
}

// ---------------------------------------------------------------------------
// Internal studio notification
// ---------------------------------------------------------------------------

export function studioNotificationEmail(data: OrderEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const { orderNumber, lines, delivery, address, totals, giftNote, placedAt } =
    data;
  const option = findDeliveryOption(delivery);
  const itemCount = lines.reduce((n, l) => n + l.quantity, 0);

  const body = `
    <tr><td style="padding:36px 40px 8px;">
      <p style="margin:0 0 14px;font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${MUTED};">
        New order · ${escapeHtml(orderNumber)}
      </p>
      <h1 style="margin:0 0 6px;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:400;color:${INK};">
        ${formatPrice(totals.totalCents)} · ${itemCount} ${itemCount === 1 ? "piece" : "pieces"}
      </h1>
      <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:#4a453e;">
        ${escapeHtml(placedAt.toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" }))}
      </p>
    </td></tr>

    <tr><td style="padding:26px 40px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CANVAS};border:1px solid ${LINE};">
        <tr>
          <td style="padding:14px 18px;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#4a453e;">
            <strong style="color:${INK};">${escapeHtml(address.fullName)}</strong><br>
            ${escapeHtml(address.email)}${address.phone ? `<br>${escapeHtml(address.phone)}` : ""}
          </td>
        </tr>
      </table>
    </td></tr>

    <tr><td style="padding:28px 40px 0;">
      <div style="font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${MUTED};padding-bottom:14px;border-bottom:1px solid ${LINE};">
        Pick list
      </div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding-top:16px;">
        ${lineRows(lines)}
      </table>
    </td></tr>

    <tr><td style="padding:0 40px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${LINE};">
        ${totalRow("Subtotal", formatPrice(totals.subtotalCents))}
        ${totalRow("Shipping", totals.shippingCents === 0 ? "COMPLIMENTARY" : formatPrice(totals.shippingCents))}
        ${totalRow("Tax", formatPrice(totals.taxCents))}
        ${totalRow("Total", formatPrice(totals.totalCents), true)}
      </table>
    </td></tr>

    <tr><td style="padding:28px 40px 0;">
      <div style="font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${MUTED};padding-bottom:14px;border-bottom:1px solid ${LINE};">
        Dispatch
      </div>
      <p style="margin:16px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.75;color:#4a453e;">
        <strong style="color:${TERRACOTTA};">${escapeHtml(option.name)}</strong><br>
        ${escapeHtml(option.blurb)}<br><br>
        ${escapeHtml(address.fullName)}<br>
        ${addressBlock(address)}
      </p>
      ${giftNote ? `<p style="margin:16px 0 0;padding:10px 14px;background:#fbf3ef;border:1px solid #f0dbd0;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#8a4a2c;">Gift note requested — handwrite on cotton wrap, omit the invoice.</p>` : ""}
    </td></tr>
  `;

  const text = [
    `NEW ORDER — ${orderNumber}`,
    `${formatPrice(totals.totalCents)} · ${itemCount} pieces`,
    placedAt.toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" }),
    ``,
    `CUSTOMER`,
    `${address.fullName} <${address.email}>`,
    address.phone,
    ``,
    `PICK LIST`,
    ...lines.map(({ product, quantity }) => `  ${quantity} × ${product.name}`),
    ``,
    `DISPATCH: ${option.name} — ${option.blurb}`,
    address.fullName,
    ...addressBlock(address).split("<br>").map((l) => l.replace(/&amp;/g, "&")),
    giftNote ? `\nGIFT NOTE REQUESTED — handwrite, omit invoice.` : "",
  ]
    .filter((l) => l !== undefined)
    .join("\n");

  return {
    subject: `New order ${orderNumber} — ${formatPrice(totals.totalCents)} (${itemCount} pcs)`,
    html: shell(body, `New order ${orderNumber} for ${formatPrice(totals.totalCents)}`),
    text,
  };
}
