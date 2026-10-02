import type { ReactNode } from "react";
import { ShopShell } from "@/components/layout/Shells";

export default function ShopLayout({ children }: { children: ReactNode }) {
  return <ShopShell>{children}</ShopShell>;
}
