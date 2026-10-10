import { products as fallbackProducts, categories } from "@/lib/data";
import type { Product } from "@/lib/types";
import { getSupabaseClient } from "@/lib/supabase";
import { supabaseUrl } from "@/lib/config";

/**
 * Catalogue access.
 *
 * Falls back to the seeded list so the storefront still renders before Supabase
 * is configured. The live database remains opt-in: set
 * `NEXT_PUBLIC_USE_SUPABASE_CATALOG=true` only when the project URL and keys are
 * known-good and intentionally being used.
 */

const USE_DATABASE =
  process.env.NEXT_PUBLIC_USE_SUPABASE_CATALOG === "true" &&
  Boolean(supabaseUrl && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/** Shape of a row in `public.products`, before mapping to the domain type. */
interface ProductRow {
  id: string;
  slug: string;
  name: string;
  material: string | null;
  tagline: string | null;
  description: string | null;
  artisan_note: string | null;
  badge: string | null;
  price_cents: number;
  compare_at_cents: number | null;
  image_url: string | null;
  rating: number | null;
  review_count: number | null;
  in_stock: boolean;
  categories: { slug: string } | null;
}

function rowToProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    material: row.material ?? "",
    tagline: row.tagline ?? "",
    description: row.description ?? "",
    artisanNote: row.artisan_note ?? "",
    badge: (row.badge as Product["badge"]) ?? undefined,
    priceCents: row.price_cents,
    compareAtCents: row.compare_at_cents ?? undefined,
    imageUrl: row.image_url ?? "",
    rating: row.rating ?? 5,
    reviewCount: row.review_count ?? 0,
    inStock: row.in_stock,
    categorySlug: row.categories?.slug ?? "",
  };
}

export async function getProducts(): Promise<Product[]> {
  if (!USE_DATABASE) return fallbackProducts;

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("products")
      .select(
        "id, slug, name, material, tagline, description, artisan_note, badge, " +
          "price_cents, compare_at_cents, image_url, rating, review_count, " +
          "in_stock, categories ( slug )",
      )
      .eq("is_published", true)
      .order("sort_order", { ascending: true });

    if (error) throw error;
    const rows = (data as unknown as ProductRow[]) ?? [];
    return rows.length > 0 ? rows.map(rowToProduct) : fallbackProducts;
  } catch (error) {
    // A database hiccup should degrade to the seeded catalogue, not a 500.
    console.error("[catalog] falling back to seed data:", error);
    return fallbackProducts;
  }
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const all = await getProducts();
  return all.find((p) => p.slug === slug) ?? null;
}

export async function getProductById(id: string): Promise<Product | null> {
  const all = await getProducts();
  return all.find((p) => p.id === id) ?? null;
}

export { categories };
