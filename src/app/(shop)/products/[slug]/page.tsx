import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import { getProductBySlug, getProducts } from "@/lib/catalog";
import { ProductPurchasePanel } from "@/components/product/ProductPurchasePanel";
import { ProductCard } from "@/components/product/ProductCard";
import { TrustStrip } from "@/components/layout/CollectionMasthead";

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Piece not found" };

  return {
    title: product.name,
    description: product.tagline,
    openGraph: {
      title: product.name,
      description: product.tagline,
      images: product.imageUrl ? [{ url: product.imageUrl }] : undefined,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const all = await getProducts();
  const related = all
    .filter((p) => p.id !== product.id && p.categorySlug === product.categorySlug)
    .slice(0, 3);

  return (
    <>
      <div className="mx-auto max-w-[1400px] px-5 py-8 sm:px-8 sm:py-10">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2">
          {[
            { label: "Home", href: "/" },
            { label: "Collections", href: "/collections/all" },
            { label: product.material || "Pieces", href: "/collections/all" },
          ].map((crumb, index) => (
            <span key={crumb.href + index} className="flex items-center gap-2">
              {index > 0 && <span className="text-line-strong">/</span>}
              <Link
                href={crumb.href}
                className="text-[11.5px] text-muted transition-colors hover:text-ink"
              >
                {crumb.label}
              </Link>
            </span>
          ))}
        </nav>

        <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Gallery */}
          <div className="space-y-3">
            <div className="relative aspect-[4/5] w-full overflow-hidden bg-surface-sunk">
              {product.imageUrl && (
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
              )}
              {product.badge && (
                <span className="eyebrow absolute left-4 top-4 bg-terracotta px-3 py-1.5 text-white">
                  {product.badge}
                </span>
              )}
            </div>
          </div>

          {/* Detail */}
          <div className="lg:pt-2">
            <p className="eyebrow text-muted">{product.material}</p>
            <h1 className="mt-3 font-display text-[34px] font-light leading-[1.1] text-ink sm:text-[40px]">
              {product.name}
            </h1>

            <div className="mt-4 flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <Star size={13} className="fill-terracotta text-terracotta" />
                <span className="tabular text-[12.5px] text-ink">
                  {product.rating.toFixed(1)}
                </span>
              </span>
              <span className="text-line-strong">·</span>
              <span className="text-[12px] text-muted">
                {product.reviewCount} owner reviews
              </span>
              <span className="text-line-strong">·</span>
              <span className="flex items-center gap-1.5 text-[12px] text-muted">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    product.inStock ? "bg-sage" : "bg-terracotta"
                  }`}
                />
                {product.inStock ? "In stock" : "Made to order"}
              </span>
            </div>

            <p className="mt-6 font-display text-[19px] leading-relaxed text-ink-soft">
              {product.tagline}
            </p>

            <ProductPurchasePanel product={product} />

            <div className="mt-10 space-y-5 border-t border-line pt-8">
              <div>
                <h2 className="eyebrow text-ink">The Object</h2>
                <p className="mt-3 text-[13px] leading-relaxed text-muted">
                  {product.description}
                </p>
              </div>
              <div>
                <h2 className="eyebrow text-ink">Provenance</h2>
                <p className="mt-3 flex items-center gap-2 text-[13px] text-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-terracotta" />
                  {product.artisanNote}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mx-auto max-w-[1400px] px-5 py-16 sm:px-8">
          <h2 className="font-display text-[26px] text-ink">
            In the same series
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}

      <div className="mt-16">
        <TrustStrip />
      </div>
    </>
  );
}
