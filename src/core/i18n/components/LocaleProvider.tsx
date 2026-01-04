// src/core/i18n/components/LocaleProvider.tsx
"use client";

import { ReactNode } from "react";
import { IntlProvider } from "next-intl";

// Import messages statically
import arMessages from "@/../public/messages/ar.json";
import enMessages from "@/../public/messages/en.json";

const MESSAGES = {
  ar: arMessages,
  en: enMessages,
} as const;

type Locale = keyof typeof MESSAGES;

interface LocaleProviderProps {
  children: ReactNode;
  locale: Locale;
}

export function LocaleProvider({ children, locale }: LocaleProviderProps) {
  return (
    <IntlProvider locale={locale} messages={MESSAGES[locale]}>
      {children}
    </IntlProvider>
  );
}
