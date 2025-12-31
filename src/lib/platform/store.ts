// src/lib/platform/store.ts

export function normalizeStoreUrl(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/**
 * Get the merchant's store URL (prioritizes Zid over Salla)
 */
export function getMerchantStoreUrl(
  sallaStoreUrl: string | null,
  zidStoreUrl: string | null
): string | null {
  // Prioritize Zid store URL, fallback to Salla
  return zidStoreUrl || sallaStoreUrl || null;
}

/**
 * Get the merchant's store URL from merchant object
 */
export function getMerchantStoreUrlFromObject(merchant: {
  sallaStoreUrl: string | null;
  zidStoreUrl: string | null;
}): string | null {
  return merchant.zidStoreUrl || merchant.sallaStoreUrl || null;
}
