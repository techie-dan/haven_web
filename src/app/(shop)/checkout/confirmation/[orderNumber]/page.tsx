import type { Metadata } from "next";
import { ConfirmationClient } from "@/components/checkout/ConfirmationClient";

export const metadata: Metadata = {
  title: "Order Confirmed",
  robots: { index: false, follow: false },
};

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  return <ConfirmationClient orderNumber={decodeURIComponent(orderNumber)} />;
}
