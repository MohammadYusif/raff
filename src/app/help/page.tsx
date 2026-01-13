// src/app/help/page.tsx
import { Metadata } from "next";
import { cookies } from "next/headers";
import { HelpContent } from "./HelpContent";
import { PageTransition } from "@/shared/components/PageTransition";

const LOCALE_COOKIE_NAME = "NEXT_LOCALE";
const TITLES = {
  ar: "مركز المساعدة - رف",
  en: "Help Center - Raff",
} as const;
const DESCRIPTIONS = {
  ar: "الأسئلة الشائعة والمساعدة حول استخدام منصة رف",
  en: "FAQs and help for using the Raff platform",
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

export default function HelpPage() {
  return (
    <PageTransition>
      <HelpContent />
    </PageTransition>
  );
}
