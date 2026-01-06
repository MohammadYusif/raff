// src/app/merchant/integrations/page.tsx
import { requireMerchant } from "@/lib/auth/guards";
import { MerchantIntegrationsContent } from "./MerchantIntegrationsContent";
import { MerchantLayout } from "@/shared/components/layouts";

export default async function MerchantIntegrationsPage() {
  await requireMerchant("page");

  return (
    <MerchantLayout>
      <MerchantIntegrationsContent />
    </MerchantLayout>
  );
}
