// src/app/merchant/join/page.tsx
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { MerchantJoinContent } from "./MerchantJoinContent";

const LOCALE_COOKIE_NAME = "NEXT_LOCALE";
const TITLES = {
  ar: "انضم كتاجر - رف",
  en: "Join as Merchant - Raff",
} as const;
const DESCRIPTIONS = {
  ar: "اربط متجرك على سلة أو زد مع رف للوصول إلى آلاف العملاء",
  en: "Connect your Salla or Zid store to Raff and reach thousands of customers",
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

export default function MerchantJoinPage() {
  return <MerchantJoinContent />;
}
