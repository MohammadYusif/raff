// src/app/layout.tsx
import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "رَفّ Raff - اكتشف المنتجات الرائجة",
  description: "منصة رَفّ - اكتشف أفضل المنتجات من المتاجر السعودية",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
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
