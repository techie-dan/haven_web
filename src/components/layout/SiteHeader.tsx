"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  LogOut,
  Menu,
  Search,
  ShoppingBag,
  User,
  X,
} from "lucide-react";import { Logo } from "@/components/brand/Logo";
import { useCart } from "@/components/cart/CartProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/cn";
import { formatPriceCompact } from "@/lib/pricing";

const PRIMARY_NAV = [
  { label: "New Arrivals", href: "/collections/new-arrivals" },
  { label: "Furniture", href: "/collections/furniture" },
  { label: "Ceramics & Tableware", href: "/collections/ceramics-tableware" },
  { label: "Lighting", href: "/collections/lighting" },
  { label: "Textiles", href: "/collections/textiles" },
  { label: "Journal", href: "/journal" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { count, subtotalCents, openCart, hydrated } = useCart();
  const { user, profile, signOut } = useAuth();
  const displayCount = hydrated ? count : 0;
  const displaySubtotal = hydrated ? subtotalCents : 0;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  // Close the account menu on outside click or Escape.
  useEffect(() => {
    if (!accountOpen) return;
    const onClick = (event: MouseEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [accountOpen]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  /**
   * Dismiss every transient layer.
   *
   * Called from each link's own click handler rather than an effect on
   * `pathname`. Effects that set state on every navigation cause a cascading
   * render, and the pathname is already available here — so the handler is both
   * cheaper and more honest about when the close actually happens.
   */
  const dismiss = () => {
    setMobileOpen(false);
    setAccountOpen(false);
    setSearchOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/92 backdrop-blur-md">
      <div className="mx-auto flex h-[68px] max-w-[1400px] items-center gap-6 px-5 sm:px-8">
        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          className="-ml-1.5 p-1.5 text-ink lg:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <Link
          href="/"
          aria-label="Haven Studio & Living — home"
          className="shrink-0"
          onClick={dismiss}
        >
          <Logo size="md" />
        </Link>

        {/* Primary navigation */}
        <nav className="hidden flex-1 items-center justify-center gap-7 lg:flex">
          {PRIMARY_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={dismiss}
              className={cn(
                "eyebrow relative py-1.5 transition-colors",
                isActive(item.href)
                  ? "text-ink"
                  : "text-ink-soft hover:text-terracotta",
              )}
            >
              {item.label}
              {isActive(item.href) && (
                <span className="absolute inset-x-0 -bottom-0.5 h-px bg-terracotta" />
              )}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          {/* Search */}
          <div className="hidden items-center sm:flex">
            {searchOpen ? (
              <form
                action="/search"
                className="flex items-center gap-2 border-b border-line-strong pb-1"
              >
                <Search size={15} className="text-muted" />
                <input
                  autoFocus
                  name="q"
                  placeholder="Search the collection…"
                  onBlur={() => setSearchOpen(false)}
                  className="w-40 bg-transparent text-[13px] text-ink placeholder:text-muted focus:outline-none xl:w-52"
                />
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="p-2 text-ink-soft transition-colors hover:text-terracotta"
                aria-label="Search"
              >
                <Search size={18} />
              </button>
            )}
          </div>

          {/* Account */}
          <div className="relative" ref={accountRef}>
            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => setAccountOpen((open) => !open)}
                  className="flex items-center gap-2 p-2 text-ink-soft transition-colors hover:text-terracotta"
                  aria-label="Account menu"
                  aria-expanded={accountOpen}
                >
                  <User size={18} />
                  <ChevronDown
                    size={12}
                    className={cn(
                      "hidden transition-transform sm:block",
                      accountOpen && "rotate-180",
                    )}
                  />
                </button>

                {accountOpen && (
                  <div className="animate-rise absolute right-0 top-full mt-2 w-60 border border-line bg-surface shadow-[0_12px_40px_-12px_rgba(28,26,23,0.18)]">
                    <div className="border-b border-line px-4 py-3.5">
                      <p className="truncate font-body text-[13px] font-medium text-ink">
                        {profile?.full_name ?? user.email}
                      </p>
                      <p className="truncate text-[11px] text-muted">
                        {user.email}
                      </p>
                    </div>
                    <Link
                      href="/account"
                      onClick={dismiss}
                      className="block px-4 py-2.5 text-[13px] text-ink-soft transition-colors hover:bg-canvas hover:text-ink"
                    >
                      Orders &amp; Account
                    </Link>
                    <button
                      type="button"
                      onClick={() => void signOut()}
                      className="flex w-full items-center gap-2 border-t border-line px-4 py-2.5 text-left text-[13px] text-ink-soft transition-colors hover:bg-canvas hover:text-terracotta"
                    >
                      <LogOut size={14} />
                      Sign out
                    </button>
                  </div>
                )}
              </>
            ) : (
              <Link
                href="/login"
                className="p-2 text-ink-soft transition-colors hover:text-terracotta"
                aria-label="Sign in"
              >
                <User size={18} />
              </Link>
            )}
          </div>

          {/* Cart */}
          <button
            type="button"
            onClick={openCart}
            className="group flex items-center gap-2 p-2 text-ink-soft transition-colors hover:text-terracotta"
            aria-label={`Open cart, ${displayCount} ${displayCount === 1 ? "item" : "items"}`}
          >
            <span className="relative">
              <ShoppingBag size={18} />
              {displayCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-terracotta px-1 text-[9px] font-semibold leading-none text-white">
                  {displayCount > 9 ? "9+" : displayCount}
                </span>
              )}
            </span>
            {displayCount > 0 && (
              <span className="tabular hidden text-[12px] font-medium text-ink sm:block">
                {formatPriceCompact(displaySubtotal)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <nav className="animate-rise border-t border-line bg-canvas px-5 py-3 lg:hidden">
          {PRIMARY_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={dismiss}
              className={cn(
                "eyebrow block border-b border-line/60 py-3.5 last:border-0",
                isActive(item.href) ? "text-terracotta" : "text-ink-soft",
              )}
            >
              {item.label}
            </Link>
          ))}
          {!user && (
            <Link
              href="/login"
              onClick={dismiss}
              className="eyebrow block pt-3.5 text-terracotta"
            >
              Sign in with Google
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
