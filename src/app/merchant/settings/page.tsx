// src/app/merchant/settings/page.tsx
import { requireMerchant } from "@/lib/auth/guards";
import { MerchantSettingsContent } from "./MerchantSettingsContent";
import { MerchantLayout } from "@/shared/components/layouts";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings | Raff Merchant Dashboard",
  description: "Manage your account and store settings",
};

export default async function MerchantSettingsPage() {
  await requireMerchant("page");
  return (
    <MerchantLayout>
      <MerchantSettingsContent />
    </MerchantLayout>
  );
}
