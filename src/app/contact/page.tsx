// src/app/contact/page.tsx
import { Metadata } from "next";
import { cookies } from "next/headers";
import { ContactContent } from "./ContactContent";
import { PageTransition } from "@/shared/components/PageTransition";

const LOCALE_COOKIE_NAME = "NEXT_LOCALE";
const TITLES = {
  ar: "اتصل بنا - رف",
  en: "Contact Us - Raff",
} as const;
const DESCRIPTIONS = {
  ar: "تواصل مع فريق رف للدعم والاستفسارات",
  en: "Get in touch with the Raff team for support and inquiries",
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

export default function ContactPage() {
  return (
    <PageTransition>
      <ContactContent />
    </PageTransition>
  );
}
