import type { ReactNode } from "react";
import { AuthShell } from "@/components/layout/Shells";

/**
 * Shell for the standalone auth pages.
 *
 * Uses the same providers as the storefront because `<SiteHeader>` renders both
 * the account menu (auth) and the basket badge (cart).
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}
