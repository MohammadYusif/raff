import { requireMerchant } from "@/lib/auth/guards";
import { MerchantDashboardContent } from "./MerchantDashboardContent";
import { PageTransition } from "@/shared/components/PageTransition";

export default async function MerchantDashboardPage() {
  await requireMerchant("page");
  return (
    <PageTransition>
      <MerchantDashboardContent />
    </PageTransition>
  );
}