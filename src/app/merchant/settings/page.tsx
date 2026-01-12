// src/app/merchant/settings/page.tsx
import { requireMerchant } from "@/lib/auth/guards";
import { MerchantSettingsContent } from "./MerchantSettingsContent";
import { MerchantLayout } from "@/shared/components/layouts";
import type { Metadata } from "next";
import { cookies } from "next/headers";

const LOCALE_COOKIE_NAME = "NEXT_LOCALE";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const storedLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  const locale = storedLocale === "en" ? "en" : "ar";

  const titles = {
    ar: "الإعدادات | لوحة تحكم التاجر - رف",
    en: "Settings | Raff Merchant Dashboard",
  };

  const descriptions = {
    ar: "إدارة حسابك وإعدادات متجرك",
    en: "Manage your account and store settings",
  };

  return {
    title: titles[locale],
    description: descriptions[locale],
  };
}

export default async function MerchantSettingsPage() {
  await requireMerchant("page");
  return (
    <MerchantLayout>
      <MerchantSettingsContent />
    </MerchantLayout>
  );
}
