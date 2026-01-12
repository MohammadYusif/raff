// src/app/merchant/orders/page.tsx
import { requireMerchant } from "@/lib/auth/guards";
import { MerchantOrdersContent } from "./MerchantOrdersContent";
import { MerchantLayout } from "@/shared/components/layouts";
import type { Metadata } from "next";
import { cookies } from "next/headers";

const LOCALE_COOKIE_NAME = "NEXT_LOCALE";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const storedLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  const locale = storedLocale === "en" ? "en" : "ar";

  const titles = {
    ar: "الطلبات | لوحة تحكم التاجر - رف",
    en: "Orders | Raff Merchant Dashboard",
  };

  const descriptions = {
    ar: "عرض وإدارة طلباتك",
    en: "View and manage your orders",
  };

  return {
    title: titles[locale],
    description: descriptions[locale],
  };
}

export default async function MerchantOrdersPage() {
  await requireMerchant("page");
  return (
    <MerchantLayout>
      <MerchantOrdersContent />
    </MerchantLayout>
  );
}
