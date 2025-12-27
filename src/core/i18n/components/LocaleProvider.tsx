// src/core/i18n/components/LocaleProvider.tsx
"use client";

import { ReactNode, useEffect, useState } from "react";
import { IntlProvider } from "next-intl";
import { getLocale } from "../utils";

// Import messages statically
import arMessages from "@/../public/messages/ar.json";
import enMessages from "@/../public/messages/en.json";

const MESSAGES = {
  ar: arMessages,
  en: enMessages,
};

interface LocaleProviderProps {
  children: ReactNode;
}

export function LocaleProvider({ children }: LocaleProviderProps) {
  const [locale, setLocale] = useState<"ar" | "en">("ar");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const currentLocale = getLocale();
    const validLocale =
      currentLocale === "ar" || currentLocale === "en" ? currentLocale : "ar";
    setLocale(validLocale);

    // Update document attributes immediately
    document.documentElement.lang = validLocale;
    document.documentElement.dir = validLocale === "ar" ? "rtl" : "ltr";

    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <IntlProvider locale={locale} messages={MESSAGES[locale]}>
      {children}
    </IntlProvider>
  );
}
