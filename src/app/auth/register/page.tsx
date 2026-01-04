// src/app/auth/register/page.tsx
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { RegisterContent } from "./RegisterContent";
import { PageTransition } from "@/shared/components/PageTransition";

/**
 * Register Page
 *
 * Auth pages intentionally don't use PageLayout to provide
 * a focused, distraction-free authentication experience without
 * navigation and footer elements that might distract from the registration flow.
 *
 * Using fade-only PageTransition variant to keep smooth animation
 * without layout shift from y-offset.
 */

const LOCALE_COOKIE_NAME = "NEXT_LOCALE";
const TITLES = {
  ar: "إنشاء حساب - رف",
  en: "Register - Raff",
} as const;
const DESCRIPTIONS = {
  ar: "أنشئ حساب رف الخاص بك",
  en: "Create your Raff account",
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

export default function RegisterPage() {
  return (
    <PageTransition variant="fade-only">
      <RegisterContent />
    </PageTransition>
  );
}
