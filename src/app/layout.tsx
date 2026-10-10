import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import "./globals.css";

/**
 * Display face — a high-contrast serif for the wordmark, product names and
 * headings. Jost carries everything else: nav, labels, prices, body copy.
 */
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const jost = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-jost",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Haven Studio & Living — Consciously crafted objects for mindful spaces",
    template: "%s · Haven Studio & Living",
  },
  description:
    "Nigerian interior design studio and storefront for architectural furnishings, unglazed stoneware, and organic linen textiles. Delivered nationwide from Lagos.",
  keywords: [
    "artisan homeware",
    "stoneware",
    "architectural furniture",
    "organic linen",
    "sustainable interiors",
  ],
  openGraph: {
    type: "website",
    siteName: "Haven Studio & Living",
    title: "Haven Studio & Living",
    description:
      "Architectural furnishings, unglazed stoneware, and organic linen textiles — crafted with master artisans.",
    url: siteUrl,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#f4f1ec",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${jost.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-canvas antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
