// src/app/cart/page.tsx
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { PageLayout } from "@/shared/components/layouts";
import { CartContent } from "./CartContent";
import { PageTransition } from "@/shared/components/PageTransition";

const LOCALE_COOKIE_NAME = "NEXT_LOCALE";
const TITLES = {
  ar: "سلة التسوق - رف",
  en: "Shopping Cart - Raff",
} as const;
const DESCRIPTIONS = {
  ar: "اعرض وأدر عناصر سلة التسوق الخاصة بك",
  en: "View and manage your shopping cart items",
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const storedLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  const locale = storedLocale === "en" ? "en" : "ar";

  return {
    title: TITLES[locale],
    description: DESCRIPTIONS[locale],
  };
}

/**
 * Cart Page
 *
 * Simple server component that renders the cart content.
 * All cart logic is handled in the CartContent client component.
 */
export default function CartPage() {
  return (
    <PageLayout>
      <PageTransition>
        <CartContent />
      </PageTransition>
    </PageLayout>
  );
}

/**
 * Metadata for the cart page
 */