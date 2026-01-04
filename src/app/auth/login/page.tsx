// src/app/auth/login/page.tsx
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { LoginContent } from "./LoginContent";
import { PageTransition } from "@/shared/components/PageTransition";

/**
 * Login Page
 *
 * Auth pages intentionally don't use PageLayout to provide
 * a focused, distraction-free authentication experience without
 * navigation and footer elements that might distract from the login flow.
 *
 * Using fade-only PageTransition variant to keep smooth animation
 * without layout shift from y-offset.
 */

const LOCALE_COOKIE_NAME = "NEXT_LOCALE";
const TITLES = {
  ar: "تسجيل الدخول - رف",
  en: "Login - Raff",
} as const;
const DESCRIPTIONS = {
  ar: "سجّل الدخول إلى حساب رف",
  en: "Login to your Raff account",
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

export default function LoginPage() {
  return (
    <PageTransition variant="fade-only">
      <LoginContent />
    </PageTransition>
  );
}
