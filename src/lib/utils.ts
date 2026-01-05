// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes with proper precedence
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const priceFormatterCache = new Map<string, Intl.NumberFormat>();

function getPriceFormatter(
  locale: string,
  currency: string,
  minimumFractionDigits?: number,
  maximumFractionDigits?: number
): Intl.NumberFormat {
  const localeKey = locale === "ar" ? "ar-SA" : "en-SA";
  const key = `${localeKey}|${currency}|${minimumFractionDigits ?? "def"}|${
    maximumFractionDigits ?? "def"
  }`;

  const cached = priceFormatterCache.get(key);
  if (cached) return cached;

  const options: Intl.NumberFormatOptions = {
    style: "currency",
    currency,
  };

  if (minimumFractionDigits !== undefined) {
    options.minimumFractionDigits = minimumFractionDigits;
  }
  if (maximumFractionDigits !== undefined) {
    options.maximumFractionDigits = maximumFractionDigits;
  }

  const formatter = new Intl.NumberFormat(localeKey, options);
  priceFormatterCache.set(key, formatter);
  return formatter;
}

export function getLocalizedText(
  locale: string,
  arValue?: string | null,
  fallback?: string | null
): string {
  const fallbackValue = fallback ?? arValue ?? "";
  if (locale === "ar") {
    return arValue ?? fallbackValue;
  }
  return fallbackValue;
}

export type NumberLike = number | string | { toNumber: () => number };

function hasToNumber(value: unknown): value is { toNumber: () => number } {
  return (
    typeof value === "object" &&
    value !== null &&
    "toNumber" in value &&
    typeof (value as { toNumber?: unknown }).toNumber === "function"
  );
}

export function toNumber(
  value: NumberLike | null | undefined,
  fallback: number = 0
): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  if (hasToNumber(value)) {
    const parsed = value.toNumber();
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

/**
 * Smooth scroll utility function
 * @param targetId - CSS selector (e.g., "#products", "#trending")
 */
export const smoothScroll = (targetId: string) => {
  const target = document.querySelector(targetId);
  if (target) {
    target.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
};

/**
 * Format price with currency support
 * @param price - Price number
 * @param locale - Locale code (ar/en)
 * @param currency - Currency code (default: SAR)
 */
export function formatPrice(
  price: NumberLike,
  locale: string = "ar",
  currency: string = "SAR",
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string {
  const minimumFractionDigits = options?.minimumFractionDigits ?? 2;
  const maximumFractionDigits = options?.maximumFractionDigits;
  const normalizedPrice = toNumber(price);
  return getPriceFormatter(
    locale,
    currency,
    minimumFractionDigits,
    maximumFractionDigits
  ).format(normalizedPrice);
}

/**
 * Format date
 * @param date - Date object or string
 * @param locale - Locale code (ar/en)
 */
export function formatDate(date: Date | string, locale: string = "ar"): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(dateObj);
}

/**
 * Truncate text with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

/**
 * Debounce function
 * @param func - Function to debounce
 * @param wait - Wait time in ms
 */
export function debounce<TArgs extends unknown[], TResult>(
  func: (...args: TArgs) => TResult,
  wait: number
): (...args: TArgs) => void {
  let timeout: NodeJS.Timeout;
  return (...args: TArgs) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Generate slug from text (Arabic/English safe)
 * @param text - Text to slugify
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w\u0600-\u06FF-]+/g, "") // Keep only word chars and Arabic
    .replace(/--+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start
    .replace(/-+$/, ""); // Trim - from end
}
