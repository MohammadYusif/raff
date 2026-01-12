// src/app/merchant/products/page.tsx
import { requireMerchant } from "@/lib/auth/guards";
import { MerchantProductsContent } from "./MerchantProductsContent";
import { MerchantLayout } from "@/shared/components/layouts";
import type { Metadata } from "next";
import { cookies } from "next/headers";

const LOCALE_COOKIE_NAME = "NEXT_LOCALE";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const storedLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  const locale = storedLocale === "en" ? "en" : "ar";

  const titles = {
    ar: "المنتجات | لوحة تحكم التاجر - رف",
    en: "Products | Raff Merchant Dashboard",
  };

  const descriptions = {
    ar: "إدارة منتجاتك وتتبع أدائها على رف",
    en: "Manage your products and track their performance on Raff",
  };

  return {
    title: titles[locale],
    description: descriptions[locale],
  };
}

export default async function MerchantProductsPage() {
  await requireMerchant("page");
  return (
    <MerchantLayout>
      <MerchantProductsContent />
    </MerchantLayout>
  );
}
