import Link from "next/link";
import { Leaf, Recycle, ShieldCheck } from "lucide-react";

const PILLARS = [
  {
    icon: ShieldCheck,
    title: "Handcrafted Provenance",
    body: "Every piece is archival-registered. A Certificate of Provenance ships with your order — naming the kiln, the region, and the maker.",
  },
  {
    icon: Leaf,
    title: "Carbon-Neutral Journey",
    body: "Delivered with plastic-free packaging, zero synthetic plastic, and full carbon-offset logistics from workshop to threshold.",
  },
  {
    icon: Recycle,
    title: "30-Day Living Trial",
    body: "Experience each piece in your own light. Complimentary return or collection if it doesn't settle into the space.",
  },
];

export function TrustStrip() {
  return (
    <section className="border-t border-line bg-surface-sunk">
      <div className="mx-auto grid max-w-[1400px] gap-px px-5 py-14 sm:px-8 md:grid-cols-3">
        {PILLARS.map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex gap-4 px-0 md:px-8 md:first:pl-0 md:last:pr-0">
            <Icon
              size={19}
              strokeWidth={1.3}
              className="mt-0.5 shrink-0 text-terracotta"
            />
            <div>
              <h3 className="font-display text-[17px] leading-snug text-ink">
                {title}
              </h3>
              <p className="mt-2 max-w-sm text-[12.5px] leading-relaxed text-muted">
                {body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Reusable editorial masthead for a collection page. */
export function CollectionMasthead({
  series,
  title,
  blurb,
  breadcrumb,
  count,
}: {
  series: string;
  title: string;
  blurb: string;
  breadcrumb: { label: string; href: string }[];
  count: number;
}) {
  return (
    <div className="mx-auto max-w-[1400px] px-5 pb-8 pt-8 sm:px-8 sm:pt-10">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2">
        {breadcrumb.map((crumb, index) => (
          <span key={`${crumb.href}-${crumb.label}-${index}`} className="flex items-center gap-2">
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

      <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="eyebrow text-muted">Series 04 · {series}</p>
          <h1 className="mt-3 font-display text-[38px] font-light leading-[1.08] tracking-[-0.01em] text-ink sm:text-[46px]">
            {title}
          </h1>
          <p className="mt-4 max-w-xl text-[13.5px] leading-relaxed text-muted">
            {blurb}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="eyebrow border border-line px-3 py-2 text-ink-soft">
            In Stock
            <span className="ml-2 text-muted">{count}</span>
          </span>
          <span className="eyebrow border border-line px-3 py-2 text-ink-soft">
            Curated
            <span className="ml-2 text-muted">{count}</span>
          </span>
          <span className="eyebrow hidden border border-line px-3 py-2 text-ink-soft sm:inline-flex">
            Archive
            <span className="ml-2 text-muted">24</span>
          </span>
        </div>
      </div>
    </div>
  );
}
