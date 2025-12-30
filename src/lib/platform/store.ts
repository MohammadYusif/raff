// src/lib/platform/store.ts
import type { Merchant } from "@prisma/client";

type MerchantStoreFields = Pick<Merchant, "zidStoreUrl" | "sallaStoreUrl">;

export function normalizeStoreUrl(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function getMerchantStoreUrl(merchant: MerchantStoreFields): string | null {
  return (
    normalizeStoreUrl(merchant.zidStoreUrl) ??
    normalizeStoreUrl(merchant.sallaStoreUrl)
  );
}
