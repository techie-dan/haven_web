import type { ReactNode } from "react";
import { CartProvider } from "@/components/cart/CartProvider";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { getProducts } from "@/lib/catalog";

/**
 * The client-side provider shell.
 *
 * Both route groups need this: the storefront shell renders `<SiteHeader>`,
 * which reads auth state for the account menu *and* cart state for the basket
 * badge. Mounting them in one place keeps the two groups from drifting.
 *
 * `catalogue` is loaded here and handed to the cart so stored lines can be
 * re-priced against live products the moment the page mounts.
 */
async function Providers({ children }: { children: ReactNode }) {
  const catalogue = await getProducts();

  return (
    <AuthProvider>
      <CartProvider catalogue={catalogue}>{children}</CartProvider>
    </AuthProvider>
  );
}

/** Storefront chrome: announcement bar, header, footer, and the cart drawer. */
export async function ShopShell({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <AnnouncementBar />
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
      <CartDrawer />
    </Providers>
  );
}

/** Chrome for the standalone auth pages — no cart drawer, nothing to buy. */
export async function AuthShell({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <AnnouncementBar />
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </Providers>
  );
}
