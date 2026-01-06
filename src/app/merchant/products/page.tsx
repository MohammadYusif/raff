// src/app/merchant/products/page.tsx
import { requireMerchant } from "@/lib/auth/guards";
import { MerchantProductsContent } from "./MerchantProductsContent";
import { MerchantLayout } from "@/shared/components/layouts";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Products | Raff Merchant Dashboard",
  description: "Manage your products and track their performance on Raff",
};

export default async function MerchantProductsPage() {
  await requireMerchant("page");
  return (
    <MerchantLayout>
      <MerchantProductsContent />
    </MerchantLayout>
  );
}
