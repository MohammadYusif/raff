// src/core/i18n/components/LocaleProvider.tsx
"use client";

import { ReactNode, useEffect, useState } from "react";
import { IntlProvider } from "next-intl";
import { getLocale } from "../utils";

interface LocaleProviderProps {
  children: ReactNode;
}

export function LocaleProvider({ children }: LocaleProviderProps) {
  const [locale, setLocale] = useState("ar");
  const [messages, setMessages] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const currentLocale = getLocale();
    setLocale(currentLocale);

    // Load messages
    import(`../../../../public/messages/${currentLocale}.json`).then((m) => {
      setMessages(m.default);
      setMounted(true);
    });
  }, []);

  if (!mounted || !messages) {
    return null; // or a loading spinner
  }

  return (
    <IntlProvider locale={locale} messages={messages}>
      {children}
    </IntlProvider>
  );
}
