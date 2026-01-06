// src/app/merchant/orders/page.tsx
import { requireMerchant } from "@/lib/auth/guards";
import { MerchantOrdersContent } from "./MerchantOrdersContent";
import { MerchantLayout } from "@/shared/components/layouts";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Orders | Raff Merchant Dashboard",
  description: "View and manage your orders",
};

export default async function MerchantOrdersPage() {
  await requireMerchant("page");
  return (
    <MerchantLayout>
      <MerchantOrdersContent />
    </MerchantLayout>
  );
}
