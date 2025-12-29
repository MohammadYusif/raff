// src/app/layout.tsx
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LocaleProvider } from "@/core/i18n/components/LocaleProvider";
import { Toaster } from "@/shared/components/ui/toaster";
import { ScrollToTop } from "@/shared/components/ScrollToTop";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Use the same cookie key from your locale utils
const LOCALE_COOKIE_NAME = "NEXT_LOCALE";

const TITLES = {
  ar: "رَفّ Raff - اكتشف المنتجات الرائجة",
  en: "Raff - Discover Trending Products",
} as const;

const DESCRIPTIONS = {
  ar: "منصة رَفّ - اكتشف أفضل المنتجات من المتاجر السعودية",
  en: "Raff Platform - Discover the best products from Saudi stores",
} as const;

// ✅ Server-side, SEO-friendly metadata
export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const storedLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  const locale = storedLocale === "en" ? "en" : "ar"; // default to ar

  const title = TITLES[locale];
  const description = DESCRIPTIONS[locale];

  return {
    title,
    description,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const storedLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  const locale = storedLocale === "en" ? "en" : "ar";
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} overflow-x-hidden antialiased`}
      >
        <LocaleProvider>
          <ScrollToTop />
          {children}
          <Toaster />
        </LocaleProvider>
      </body>
    </html>
  );
}
