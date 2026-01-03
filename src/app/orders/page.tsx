// src/app/orders/page.tsx
import { PageLayout } from "@/shared/components/layouts";
import { OrderHistoryContent } from "./OrderHistoryContent";

export const metadata = {
  title: "Order History - Raff",
  description: "View your order history and track your purchases",
};

export default function OrderHistoryPage() {
  return (
    <PageLayout>
      <OrderHistoryContent />
    </PageLayout>
  );
}
