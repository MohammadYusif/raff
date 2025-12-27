// src/core/i18n/config.ts
/**
 * Internationalization Configuration
 * Supports Arabic (RTL) and English (LTR)
 */

export type Locale = "ar" | "en";

export interface LocaleConfig {
  code: Locale;
  name: string;
  dir: "rtl" | "ltr";
  flag: string;
}

export const LOCALES: Record<Locale, LocaleConfig> = {
  ar: {
    code: "ar",
    name: "العربية",
    dir: "rtl",
    flag: "🇸🇦",
  },
  en: {
    code: "en",
    name: "English",
    dir: "ltr",
    flag: "🇬🇧",
  },
};

export const DEFAULT_LOCALE: Locale = "ar";

export const LOCALE_COOKIE_NAME = "NEXT_LOCALE";
