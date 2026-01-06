// src/app/merchant/integrations/page.tsx
import { requireMerchant } from "@/lib/auth/guards";
import { MerchantIntegrationsContent } from "./MerchantIntegrationsContent";

export default async function MerchantIntegrationsPage() {
  await requireMerchant("page");

  return <MerchantIntegrationsContent />;
}
