// src/app/orders/page.tsx
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { PageLayout } from "@/shared/components/layouts";
import { OrderHistoryContent } from "./OrderHistoryContent";
import { PageTransition } from "@/shared/components/PageTransition";
import arMessages from "@/../public/messages/ar.json";
import enMessages from "@/../public/messages/en.json";

const LOCALE_COOKIE_NAME = "NEXT_LOCALE";
const TITLES = {
  ar: `${arMessages.orders.title} - رف`,
  en: `${enMessages.orders.title} - Raff`,
} as const;
const DESCRIPTIONS = {
  ar: arMessages.orders.subtitle,
  en: enMessages.orders.subtitle,
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

export default function OrderHistoryPage() {
  return (
    <PageLayout>
      <PageTransition>
        <OrderHistoryContent />
      </PageTransition>
    </PageLayout>
  );
}
