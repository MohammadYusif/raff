// src/app/merchant/complete-registration/page.tsx
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { CompleteRegistrationContent } from "./CompleteRegistrationContent";
import { PageTransition } from "@/shared/components/PageTransition";

const LOCALE_COOKIE_NAME = "NEXT_LOCALE";
const TITLES = {
  ar: "إكمال التسجيل - رف",
  en: "Complete Registration - Raff",
} as const;
const DESCRIPTIONS = {
  ar: "أكمل تسجيلك كتاجر على رف",
  en: "Complete your merchant registration on Raff",
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

export default function CompleteRegistrationPage() {
  return (
    <PageTransition>
      <CompleteRegistrationContent />
    </PageTransition>
  );
}
