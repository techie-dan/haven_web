import Link from "next/link";
import { LogoMark } from "@/components/brand/Logo";
import { NewsletterForm } from "@/components/layout/NewsletterForm";

const COLUMNS = [
  {
    title: "Curations",
    links: [
      { label: "Architectural Furniture", href: "/collections/furniture" },
      { label: "Tableware & Vessel", href: "/collections/ceramics-tableware" },
      { label: "Sculptural Lighting", href: "/collections/lighting" },
      { label: "Handwoven Linens", href: "/collections/textiles" },
      { label: "Artisan Bronzeworks", href: "/collections/bronze" },
    ],
  },
  {
    title: "Client Care",
    links: [
      { label: "White Glove Delivery", href: "/delivery" },
      { label: "Returns & Provenance", href: "/returns" },
      { label: "Material Care & Repair", href: "/care" },
      { label: "Trade & Interior Specs", href: "/trade" },
      { label: "Bespoke Inquiries", href: "/contact" },
    ],
  },
];

const PAYMENT_MARKS = ["Visa", "Mastercard", "Amex", "Apple Pay"];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-canvas">
      <div className="mx-auto max-w-[1400px] px-5 py-16 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5">
              <LogoMark className="h-8 w-auto text-ink" />
              <span className="wordmark text-[19px]">Haven</span>
            </div>
            <p className="mt-5 max-w-sm font-display text-[17px] leading-relaxed text-ink-soft">
              Mindfully produced architectural furnishings, unglazed stoneware,
              and organic linen textiles. Crafted in harmony with
              multi-generational master workshops across Scandinavia and Japan.
            </p>
            <p className="eyebrow mt-6 text-muted">
              Provenance &amp; Stewardship
            </p>
            <p className="mt-2 max-w-sm text-[12.5px] leading-relaxed text-muted">
              100% certified raw materials, zero plastic in parcel shipping, and
              lifetime structural restoration guarantees.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.title}>
              <h2 className="eyebrow text-ink">{column.title}</h2>
              <ul className="mt-5 space-y-3">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[12.5px] text-muted transition-colors hover:text-terracotta"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/* Newsletter */}
          <div>
            <h2 className="font-display text-[21px] text-ink">The Gazette</h2>
            <p className="mt-3 max-w-xs text-[12.5px] leading-relaxed text-muted">
              Subscribers receive quarterly private editions, architectural
              essays, and early acquisition privileges.
            </p>
            <NewsletterForm />
          </div>
        </div>

        {/* Baseline */}
        <div className="mt-14 flex flex-col gap-5 border-t border-line pt-6 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-[11.5px] text-muted">
            © {new Date().getFullYear()} Haven Studio &amp; Living. All
            architectural concepts, designs, and content reserved.
          </p>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {["Privacy Policy", "Terms of Commission", "Sustainability Declaration"].map(
              (label) => (
                <Link
                  key={label}
                  href={`/${label.toLowerCase().replace(/\s+/g, "-")}`}
                  className="eyebrow text-muted transition-colors hover:text-ink"
                >
                  {label}
                </Link>
              ),
            )}
          </div>

          <div className="flex items-center gap-2">
            {PAYMENT_MARKS.map((mark) => (
              <span
                key={mark}
                className="border border-line px-2 py-1 text-[9px] font-medium uppercase tracking-[0.12em] text-muted"
              >
                {mark}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
