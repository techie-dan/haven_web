"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CartLine } from "@/lib/types";

/**
 * Server-side basket helpers.
 *
 * The cart is account-scoped in Postgres (`public.cart_items`, see
 * `supabase/migrations/0003_carts.sql`) so the website and the mobile app share
 * one basket. Guests keep localStorage; the first sign-in merges those lines
 * into the account cart via `mergeGuestLines`.
 *
 * Every function takes the caller's Supabase client and user id — RLS rejects
 * any row that is not the caller's own, so the id is a convenience for filters,
 * not a trust boundary.
 */

export interface CartRow {
  product_id: string;
  quantity: number;
}

export async function fetchCartRows(
  supabase: SupabaseClient,
  userId: string,
): Promise<CartRow[]> {
  const { data, error } = await supabase
    .from("cart_items")
    .select("product_id, quantity")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as CartRow[] | null) ?? [];
}

/**
 * Folds this device's guest cart into the account cart, summing quantities on
 * overlap (clamped to the 10-per-line ceiling the schema enforces).
 */
export async function mergeGuestLines(
  supabase: SupabaseClient,
  userId: string,
  lines: CartLine[],
): Promise<void> {
  if (lines.length === 0) return;

  const existing = await fetchCartRows(supabase, userId);
  const onServer = new Map(existing.map((row) => [row.product_id, row.quantity]));

  const payload = lines.map((line) => ({
    user_id: userId,
    product_id: line.product.id,
    quantity: Math.min(10, (onServer.get(line.product.id) ?? 0) + line.quantity),
  }));

  const { error } = await supabase
    .from("cart_items")
    .upsert(payload, { onConflict: "user_id,product_id" });

  if (error) throw error;
}

export async function upsertCartItem(
  supabase: SupabaseClient,
  userId: string,
  productId: string,
  quantity: number,
): Promise<void> {
  const { error } = await supabase.from("cart_items").upsert(
    {
      user_id: userId,
      product_id: productId,
      quantity: Math.min(10, Math.max(1, quantity)),
    },
    { onConflict: "user_id,product_id" },
  );

  if (error) throw error;
}

export async function deleteCartItem(
  supabase: SupabaseClient,
  userId: string,
  productId: string,
): Promise<void> {
  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("user_id", userId)
    .eq("product_id", productId);

  if (error) throw error;
}

export async function clearServerCart(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("user_id", userId);

  if (error) throw error;
}
