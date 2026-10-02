import type { User } from "@supabase/supabase-js";

/** A product as rendered in the collection grid and cart. */
export interface Product {
  id: string;
  slug: string;
  name: string;
  /** e.g. "TERRACOTTA CLAY" — the small-caps eyebrow above the name. */
  material: string;
  /** Short merchandising line shown under the name. */
  tagline: string;
  description: string;
  /** e.g. "Made in Kyoto" — right-hand meta on the card. */
  artisanNote: string;
  badge?: "BEST SELLER" | "RESERVE" | "LAST PIECES";
  priceCents: number;
  compareAtCents?: number;
  imageUrl: string;
  gallery?: string[];
  rating: number;
  reviewCount: number;
  inStock: boolean;
  categorySlug: string;
}

export interface Category {
  slug: string;
  name: string;
}

/** A line in the basket. `product` is embedded so the cart survives refreshes. */
export interface CartLine {
  product: Product;
  quantity: number;
}

export type DeliveryKey = "standard_ground" | "white_glove" | "eco_courier";

export interface DeliveryOption {
  key: DeliveryKey;
  name: string;
  blurb: string;
  priceCents: number;
  /** Renders the "RECOMMENDED" pill on the option card. */
  recommended?: boolean;
  /** Free above this basket subtotal (cents). Undefined = always charged. */
  freeOverCents?: number;
}

export interface ShippingAddress {
  fullName: string;
  email: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface OrderTotals {
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  /** True when the delivery tier was comped by the free-shipping threshold. */
  shippingComped: boolean;
}

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
};

/** Shape returned by the checkout API on success. */
export interface PlaceOrderResult {
  orderNumber: string;
  totalCents: number;
  email: string;
}

export type { User };
