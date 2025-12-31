// src/core/i18n/utils.ts
"use client";

const LOCALE_STORAGE_KEY = "NEXT_LOCALE";
const DEFAULT_LOCALE = "ar";

/**
 * Get stored locale from cookie or localStorage
 * @returns locale code (ar or en)
 */
export function getLocale(): string {
  // Check if we're in browser
  if (typeof window === "undefined") {
    return DEFAULT_LOCALE;
  }

  // Try to get from cookie first
  const cookies = document.cookie.split(";");
  const localeCookie = cookies.find((cookie) =>
    cookie.trim().startsWith(`${LOCALE_STORAGE_KEY}=`)
  );

  if (localeCookie) {
    return localeCookie.split("=")[1].trim();
  }

  // Fallback to localStorage
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored) {
      return stored;
    }
  } catch {
    // localStorage might not be available
  }

  return DEFAULT_LOCALE;
}

/**
 * Persist locale to cookie and localStorage
 * @param locale - locale code to save
 */
export function setLocale(locale: string): void {
  // Check if we're in browser
  if (typeof window === "undefined") {
    return;
  }

  // Save to cookie (365 days expiry)
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  document.cookie = `${LOCALE_STORAGE_KEY}=${locale}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;

  // Save to localStorage as backup
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // localStorage might not be available
  }
}
