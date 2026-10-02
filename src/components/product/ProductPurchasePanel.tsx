"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/pricing";
import { useCart } from "@/components/cart/CartProvider";
import { cn } from "@/lib/cn";

export function ProductPurchasePanel({ product }: { product: Product }) {
  const router = useRouter();
  const { addItem, lines } = useCart();
  const [quantity, setQuantity] = useState(1);
  const inCart = lines.some((line) => line.product.id === product.id);

  function handleAdd() {
    addItem(product, quantity);
  }

  // Buy-now adds silently so the drawer doesn't animate open behind the
  // navigation we're about to perform.
  function handleBuyNow() {
    addItem(product, quantity, { silent: true });
    router.push("/checkout");
  }

  return (
    <div className="mt-8">
      <div className="flex items-baseline gap-4">
        <span className="tabular font-display text-[30px] leading-none text-ink">
          {formatPrice(product.priceCents)}
        </span>
        {product.compareAtCents && (
          <span className="tabular text-[15px] text-muted line-through">
            {formatPrice(product.compareAtCents)}
          </span>
        )}
      </div>

      <p className="mt-3 text-[11.5px] text-muted">
        Free carbon-neutral delivery over $150
      </p>

      <div className="mt-7 flex flex-wrap items-stretch gap-3">
        {/* Quantity */}
        <div className="flex items-center border border-line">
          <button
            type="button"
            onClick={() => setQuantity((n) => Math.max(1, n - 1))}
            aria-label="Decrease quantity"
            className="px-4 py-3.5 text-ink-soft transition-colors hover:text-terracotta"
          >
            <Minus size={14} />
          </button>
          <span className="tabular min-w-[36px] text-center text-[14px] text-ink">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((n) => Math.min(10, n + 1))}
            aria-label="Increase quantity"
            className="px-4 py-3.5 text-ink-soft transition-colors hover:text-terracotta"
          >
            <Plus size={14} />
          </button>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          className={cn(
            "eyebrow flex flex-1 items-center justify-center gap-2.5 px-8 py-4 text-white transition-colors",
            inCart ? "bg-sage" : "bg-ink hover:bg-terracotta",
          )}
        >
          <ShoppingBag size={15} />
          {inCart ? "Added to basket" : "Add to basket"}
        </button>
      </div>

      <button
        type="button"
        onClick={handleBuyNow}
        className="eyebrow mt-3 flex w-full items-center justify-center border border-ink py-4 text-ink transition-colors hover:bg-ink hover:text-white"
      >
        Acquire now — express checkout
      </button>

      <ul className="mt-7 space-y-2.5 border-t border-line pt-6">
        {[
          "Certificate of Provenance included",
          "30-day in-home trial with complimentary returns",
          "Broken-in-transit replacement guarantee",
        ].map((item) => (
          <li
            key={item}
            className="flex items-start gap-2.5 text-[12px] leading-relaxed text-muted"
          >
            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-terracotta" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
