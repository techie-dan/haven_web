import { z } from "zod";

/** Shared request validation for `POST /api/orders` and the newsletter route. */

export const shippingAddressSchema = z.object({
  fullName: z.string().trim().min(1, "Required").max(120),
  email: z.string().trim().email("Enter a valid email").max(200),
  phone: z.string().trim().max(40).optional().default(""),
  line1: z.string().trim().min(1, "Required").max(200),
  line2: z.string().trim().max(200).optional().default(""),
  city: z.string().trim().min(1, "Required").max(120),
  state: z.string().trim().min(1, "Required").max(120),
  postalCode: z.string().trim().min(1, "Required").max(24),
  country: z.string().trim().min(1).max(120).default("United States"),
});

export const orderItemSchema = z.object({
  productId: z.string().trim().min(1),
  quantity: z.number().int().min(1).max(10),
});

export const placeOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, "Your basket is empty.").max(40),
  address: shippingAddressSchema,
  delivery: z.enum(["standard_ground", "white_glove", "eco_courier"]),
  giftNote: z.boolean().optional().default(false),
  discountCode: z.string().trim().max(40).nullable().optional(),
  paymentMethod: z.enum(["card", "paypal", "klarna"]),
});

export const newsletterSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(200),
});

export type PlaceOrderRequest = z.infer<typeof placeOrderSchema>;

/**
 * Turns a zod error into the `{ field: message }` shape the checkout form
 * expects, so an invalid field is highlighted rather than dumped in a banner.
 */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};

  for (const issue of error.issues) {
    // "address.postalCode" → "postalCode"; top-level issues have no prefix.
    const path = issue.path.filter((part) => typeof part === "string");
    const key = String(path[path.length - 1] ?? "form");
    if (!result[key]) result[key] = issue.message;
  }

  return result;
}
