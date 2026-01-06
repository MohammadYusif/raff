import { requireMerchant } from "@/lib/auth/guards";
import { MerchantDashboardContent } from "./MerchantDashboardContent";
import { MerchantLayout } from "@/shared/components/layouts";

export default async function MerchantDashboardPage() {
  await requireMerchant("page");
  return (
    <MerchantLayout>
      <MerchantDashboardContent />
    </MerchantLayout>
  );
}