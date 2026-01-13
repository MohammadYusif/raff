// src/app/terms/page.tsx
import { Metadata } from "next";
import { cookies } from "next/headers";
import { TermsContent } from "./TermsContent";
import { PageTransition } from "@/shared/components/PageTransition";

const LOCALE_COOKIE_NAME = "NEXT_LOCALE";
const TITLES = {
  ar: "شروط الخدمة - رف",
  en: "Terms of Service - Raff",
} as const;
const DESCRIPTIONS = {
  ar: "شروط وأحكام استخدام منصة رف للتجارة الإلكترونية",
  en: "Terms and conditions for using the Raff e-commerce platform",
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

export default function TermsOfServicePage() {
  return (
    <PageTransition>
      <TermsContent />
    </PageTransition>
  );
}
