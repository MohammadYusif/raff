// src/core/i18n/hooks/useLocale.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { getLocale, setLocale as persistLocale } from "../utils";

interface LocaleConfig {
  code: string;
  name: string;
  dir: string;
}

const LOCALES: Record<string, LocaleConfig> = {
  ar: { code: "ar", name: "العربية", dir: "rtl" },
  en: { code: "en", name: "English", dir: "ltr" },
};

// Derived constants from LOCALES
const AVAILABLE_LOCALE_CODES = Object.keys(LOCALES);
const DEFAULT_LOCALE_CODE = "ar"; // Arabic as default for Raff
const DEFAULT_LOCALE_CONFIG = LOCALES[DEFAULT_LOCALE_CODE];

export function useLocale() {
  const [locale, setCurrentLocale] = useState<string>(DEFAULT_LOCALE_CODE);
  const [dir, setDir] = useState<string>(DEFAULT_LOCALE_CONFIG.dir);
  const [isReady, setIsReady] = useState(false);

  // Current locale config with fallback to default
  const currentConfig: LocaleConfig = LOCALES[locale] || DEFAULT_LOCALE_CONFIG;

  useEffect(() => {
    // Initialize locale from cookie/localStorage
    const initialLocale = getLocale();
    // Validate that the stored locale exists in LOCALES
    const validatedLocale = LOCALES[initialLocale]
      ? initialLocale
      : DEFAULT_LOCALE_CODE;

    setCurrentLocale(validatedLocale);
    setDir(LOCALES[validatedLocale].dir);
    setIsReady(true);
  }, []);

  // Update document attributes when locale or dir changes
  useEffect(() => {
    if (!isReady) return;

    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir, isReady]);

  const switchLocale = useCallback(
    (newLocale?: string) => {
      let targetLocale: string;

      if (newLocale && LOCALES[newLocale]) {
        // Use provided locale if it exists
        targetLocale = newLocale;
      } else {
        // Auto-switch to next available locale
        const currentIndex = AVAILABLE_LOCALE_CODES.indexOf(locale);
        const nextIndex = (currentIndex + 1) % AVAILABLE_LOCALE_CODES.length;
        targetLocale = AVAILABLE_LOCALE_CODES[nextIndex];
      }

      // Save to storage
      persistLocale(targetLocale);

      // Reload the page to apply new locale
      window.location.reload();
    },
    [locale]
  );

  return {
    locale,
    dir,
    currentConfig,
    availableLocales: Object.values(LOCALES),
    switchLocale,
    isReady,
  };
}
