// src/core/i18n/components/DirectionalIcons.tsx
"use client";

import { useLocale } from "../hooks/useLocale";
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  type LucideProps,
} from "lucide-react";

/**
 * ChevronForward - Points forward in current language direction
 * → in LTR (English), ← in RTL (Arabic)
 */
export function ChevronForward(props: LucideProps) {
  const { dir } = useLocale();
  return dir === "rtl" ? <ChevronLeft {...props} /> : <ChevronRight {...props} />;
}

/**
 * ChevronBack - Points back in current language direction
 * ← in LTR (English), → in RTL (Arabic)
 */
export function ChevronBack(props: LucideProps) {
  const { dir } = useLocale();
  return dir === "rtl" ? <ChevronRight {...props} /> : <ChevronLeft {...props} />;
}

/**
 * ArrowForward - Points forward in current language direction
 */
export function ArrowForward(props: LucideProps) {
  const { dir } = useLocale();
  return dir === "rtl" ? <ArrowLeft {...props} /> : <ArrowRight {...props} />;
}

/**
 * ArrowBack - Points back in current language direction
 */
export function ArrowBack(props: LucideProps) {
  const { dir } = useLocale();
  return dir === "rtl" ? <ArrowRight {...props} /> : <ArrowLeft {...props} />;
}
