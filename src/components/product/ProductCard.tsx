"use client";

import Link from "next/link";
import { Heart, Plus, Star } from "lucide-react";
import { useState } from "react";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/cn";
import { formatPriceCompact } from "@/lib/pricing";
import { ProductImage } from "@/components/ui/ProductImage";
import { useCart } from "@/components/cart/CartProvider";

/**
 * A single tile in the collection grid.
 *
 * The whole card is one link to the product; the wishlist and add-to-cart
 * controls sit above it as siblings rather than nested inside it, so there is
 * never an interactive element inside an anchor.
 */
export function ProductCard({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  const { addItem, removeItem, lines } = useCart();
  const [saved, setSaved] = useState(false);

  function handleToggle() {
    const present = lines.some((l) => l.product.id === product.id);
    if (present) removeItem(product.id);
    else addItem(product);
  }

  return (
    <article className="group relative flex flex-col">
      <div className="relative">
        <Link
          href={`/products/${product.slug}`}
          className="block"
          aria-label={product.name}
        >
          <ProductImage
            src={product.imageUrl}
            alt={product.name}
            className="aspect-[4/5] w-full"
            imageClassName="transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.035]"
            priority={priority}
          />
        </Link>

        {product.badge && (
          <span className="eyebrow absolute left-3 top-3 bg-terracotta px-2.5 py-1 text-white">
            {product.badge}
          </span>
        )}

        <button
          type="button"
          onClick={() => setSaved((value) => !value)}
          aria-label={saved ? "Remove from saved" : "Save for later"}
          aria-pressed={saved}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-surface/85 backdrop-blur transition-colors hover:bg-surface"
        >
          <Heart
            size={14}
            className={cn(
              "transition-colors",
              saved ? "fill-terracotta text-terracotta" : "text-ink-soft",
            )}
          />
        </button>

        {/* Quick-add — revealed on hover, always reachable by keyboard focus. */}
        {product.inStock && (
          <button
            type="button"
            onClick={handleToggle}
            className={cn(
              "eyebrow absolute inset-x-3 bottom-3 flex items-center justify-center gap-2 py-2.5",
              "bg-ink/92 text-white backdrop-blur transition-all duration-300",
              "opacity-100 translate-y-0 sm:opacity-0 sm:translate-y-2 sm:group-hover:translate-y-0 sm:group-hover:opacity-100",
              "focus-visible:translate-y-0 focus-visible:opacity-100",
              (lines.some((l) => l.product.id === product.id)) && "translate-y-0 opacity-100 bg-sage",
            )}
          >
            {lines.some((l) => l.product.id === product.id) ? "Added to basket" : (<><Plus size={13} /> Quick add</>)}
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col pt-4">
        <p className="eyebrow text-muted">{product.material}</p>

        <div className="mt-1.5 flex items-start justify-between gap-3">
          <Link href={`/products/${product.slug}`} className="flex-1">
            <h3 className="font-display text-[17px] leading-snug text-ink transition-colors group-hover:text-terracotta">
              {product.name}
            </h3>
          </Link>
          <Rating value={product.rating} count={product.reviewCount} />
        </div>

        <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-muted">
          {product.tagline}
        </p>

        <div className="mt-auto flex items-baseline justify-between gap-3 pt-3.5">
          <span className="tabular font-display text-[18px] text-ink">
            {formatPriceCompact(product.priceCents)}
            {product.compareAtCents && (
              <span className="ml-2 font-body text-[12px] text-muted line-through">
                {formatPriceCompact(product.compareAtCents)}
              </span>
            )}
          </span>
          <span className="truncate text-[11px] text-muted">
            {product.artisanNote}
          </span>
        </div>
      </div>
    </article>
  );
}

function Rating({ value, count }: { value: number; count: number }) {
  return (
    <span
      className="flex shrink-0 items-center gap-1 pt-1"
      title={`${value} out of 5 from ${count} reviews`}
    >
      <Star size={11} className="fill-terracotta text-terracotta" />
      <span className="tabular text-[11px] text-ink-soft">{value.toFixed(1)}</span>
    </span>
  );
}
