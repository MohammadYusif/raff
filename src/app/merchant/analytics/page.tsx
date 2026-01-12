// src/app/merchant/analytics/page.tsx
import { requireMerchant } from "@/lib/auth/guards";
import { MerchantAnalyticsContent } from "./MerchantAnalyticsContent";
import { MerchantLayout } from "@/shared/components/layouts";
import type { Metadata } from "next";
import { cookies } from "next/headers";

const LOCALE_COOKIE_NAME = "NEXT_LOCALE";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const storedLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  const locale = storedLocale === "en" ? "en" : "ar";

  const titles = {
    ar: "التحليلات | لوحة تحكم التاجر - رف",
    en: "Analytics | Raff Merchant Dashboard",
  };

  const descriptions = {
    ar: "تتبع أداء متجرك ومقاييس اكتشاف المنتجات",
    en: "Track your store performance and product discovery metrics",
  };

  return {
    title: titles[locale],
    description: descriptions[locale],
  };
}

export default async function MerchantAnalyticsPage() {
  await requireMerchant("page");
  return (
    <MerchantLayout>
      <MerchantAnalyticsContent />
    </MerchantLayout>
  );
}
