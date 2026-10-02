"use client";

import Link from "next/link";
import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { ProductImage } from "@/components/ui/ProductImage";
import { formatPrice, amountToFreeShipping } from "@/lib/pricing";
import { FREE_SHIPPING_THRESHOLD_CENTS } from "@/lib/data";

export function CartDrawer() {
  const {
    lines,
    count,
    subtotalCents,
    isOpen,
    closeCart,
    setQuantity,
    removeItem,
    hydrated,
  } = useCart();

  const visibleLines = hydrated ? lines : [];
  const visibleCount = hydrated ? count : 0;
  const visibleSubtotal = hydrated ? subtotalCents : 0;
  const remaining = amountToFreeShipping(visibleSubtotal);
  const progress = Math.min(
    100,
    (subtotalCents / FREE_SHIPPING_THRESHOLD_CENTS) * 100,
  );

  return (
    <>
      {/* Scrim */}
      <div
        onClick={closeCart}
        aria-hidden="true"
        className={`fixed inset-0 z-50 bg-ink/35 backdrop-blur-[2px] transition-opacity duration-400 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping basket"
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-[420px] flex-col bg-canvas shadow-[-20px_0_60px_-20px_rgba(28,26,23,0.3)] transition-transform duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        inert={!isOpen}
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="eyebrow text-ink">
            Your Basket{visibleCount > 0 && ` · ${visibleCount}`}
          </h2>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Close basket"
            className="-mr-1.5 p-1.5 text-ink-soft transition-colors hover:text-terracotta"
          >
            <X size={18} />
          </button>
        </header>

        {visibleLines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <ShoppingBag size={30} strokeWidth={1.2} className="text-line-strong" />
            <p className="font-display text-[19px] text-ink">
              Your basket is empty
            </p>
            <p className="max-w-[240px] text-[12.5px] leading-relaxed text-muted">
              Every piece is made in small batches. Begin with the collection.
            </p>
            <Link
              href="/collections/all"
              onClick={closeCart}
              className="eyebrow mt-2 border border-ink px-6 py-3 text-ink transition-colors hover:bg-ink hover:text-white"
            >
              Browse the collection
            </Link>
          </div>
        ) : (
          <>
            {/* Free-shipping progress */}
            <div className="border-b border-line px-5 py-4">
              <p className="text-[12px] text-ink-soft">
                {remaining === 0 ? (
                  <span className="text-sage">
                    Your order qualifies for complimentary delivery.
                  </span>
                ) : (
                  <>
                    <span className="tabular font-medium text-ink">
                      {formatPrice(remaining)}
                    </span>{" "}
                    away from complimentary delivery
                  </>
                )}
              </p>
              <div className="mt-2.5 h-[3px] w-full bg-line">
                <div
                  className="h-full bg-terracotta transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
              {visibleLines.map(({ product, quantity }) => (
                <li key={product.id} className="flex gap-4 py-5">
                  <Link href={`/products/${product.slug}`} onClick={closeCart}>
                    <ProductImage
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-[92px] w-[74px] shrink-0"
                      sizes="74px"
                    />
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/products/${product.slug}`}
                        onClick={closeCart}
                        className="font-display text-[15px] leading-snug text-ink transition-colors hover:text-terracotta"
                      >
                        {product.name}
                      </Link>
                      <button
                        type="button"
                        onClick={() => removeItem(product.id)}
                        aria-label={`Remove ${product.name}`}
                        className="-mr-1 -mt-1 shrink-0 p-1 text-muted transition-colors hover:text-terracotta"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <p className="eyebrow mt-1 text-muted">{product.material}</p>

                    <div className="mt-auto flex items-center justify-between pt-3">
                      <div className="flex items-center border border-line">
                        <button
                          type="button"
                          onClick={() => setQuantity(product.id, quantity - 1)}
                          aria-label="Decrease quantity"
                          className="px-2 py-1.5 text-ink-soft transition-colors hover:text-terracotta"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="tabular min-w-[26px] text-center text-[13px] text-ink">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuantity(product.id, quantity + 1)}
                          aria-label="Increase quantity"
                          className="px-2 py-1.5 text-ink-soft transition-colors hover:text-terracotta"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                      <span className="tabular font-display text-[15px] text-ink">
                        {formatPrice(product.priceCents * quantity)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <footer className="border-t border-line px-5 py-5">
              <div className="flex items-baseline justify-between">
                <span className="eyebrow text-muted">Subtotal</span>
                <span className="tabular font-display text-[22px] text-ink">
                  {formatPrice(visibleSubtotal)}
                </span>
              </div>
              <p className="mt-1.5 text-[11px] text-muted">
                Shipping and taxes calculated at checkout.
              </p>
              <Link
                href="/checkout"
                onClick={closeCart}
                className="eyebrow mt-4 flex w-full items-center justify-center gap-2 bg-ink py-4 text-white transition-colors hover:bg-terracotta"
              >
                Proceed to checkout
              </Link>
              <button
                type="button"
                onClick={closeCart}
                className="eyebrow mt-3 w-full py-2 text-muted transition-colors hover:text-ink"
              >
                Continue browsing
              </button>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}
