import { requireMerchant } from "@/lib/auth/guards";
import { MerchantDashboardContent } from "./MerchantDashboardContent";

export default async function MerchantDashboardPage() {
  await requireMerchant("page");
  return <MerchantDashboardContent />;
}
