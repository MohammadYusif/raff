// src/app/cart/page.tsx
import { PageLayout } from "@/shared/components/layouts";
import { CartContent } from "./CardContent";

/**
 * Cart Page
 *
 * Simple server component that renders the cart content.
 * All cart logic is handled in the CartContent client component.
 */
export default function CartPage() {
  return (
    <PageLayout>
      <CartContent />
    </PageLayout>
  );
}

/**
 * Metadata for the cart page
 */
export const metadata = {
  title: "Shopping Cart - Raff",
  description: "View and manage your shopping cart items",
};
