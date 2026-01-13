// src/app/privacy/page.tsx
import { Metadata } from "next";
import { cookies } from "next/headers";
import { PrivacyContent } from "./PrivacyContent";
import { PageTransition } from "@/shared/components/PageTransition";

const LOCALE_COOKIE_NAME = "NEXT_LOCALE";
const TITLES = {
  ar: "سياسة الخصوصية - رف",
  en: "Privacy Policy - Raff",
} as const;
const DESCRIPTIONS = {
  ar: "سياسة الخصوصية لمنصة رف - كيف نجمع ونستخدم ونحمي بياناتك الشخصية",
  en: "Raff's Privacy Policy - How we collect, use, and protect your personal data",
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

export default function PrivacyPolicyPage() {
  return (
    <PageTransition>
      <PrivacyContent />
    </PageTransition>
  );
}
