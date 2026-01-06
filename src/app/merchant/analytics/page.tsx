// src/app/merchant/analytics/page.tsx
import { requireMerchant } from "@/lib/auth/guards";
import { MerchantAnalyticsContent } from "./MerchantAnalyticsContent";
import { MerchantLayout } from "@/shared/components/layouts";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analytics | Raff Merchant Dashboard",
  description: "Track your store performance and product discovery metrics",
};

export default async function MerchantAnalyticsPage() {
  await requireMerchant("page");
  return (
    <MerchantLayout>
      <MerchantAnalyticsContent />
    </MerchantLayout>
  );
}
