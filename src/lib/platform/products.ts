// src/lib/platform/products.ts
import { getSallaConfig, getZidConfig } from "@/lib/platform/config";
import { normalizeStoreUrl } from "@/lib/platform/store";

type Platform = "zid" | "salla";

function applyTemplate(
  template: string,
  storeUrl: string,
  slugOrId: string
): string {
  return template
    .replace("{storeUrl}", storeUrl)
    .replace("{slugOrId}", slugOrId);
}

export function buildExternalProductUrl(params: {
  platform: Platform;
  product: {
    externalProductUrl?: string | null;
    sallaUrl?: string | null;
    slug?: string | null;
    zidProductId?: string | null;
    sallaProductId?: string | null;
  };
  storeUrl?: string | null;
  providedUrl?: string | null;
}): string | null {
  const { platform, product, storeUrl, providedUrl } = params;
  const normalizedStoreUrl = normalizeStoreUrl(storeUrl || undefined);

  if (product.externalProductUrl) return product.externalProductUrl;
  if (providedUrl) return normalizeStoreUrl(providedUrl) ?? providedUrl;
  if (product.sallaUrl)
    return normalizeStoreUrl(product.sallaUrl) ?? product.sallaUrl;
  if (!normalizedStoreUrl) return null;

  const slugOrId =
    platform === "zid"
      ? product.zidProductId || product.slug || ""
      : product.slug || product.sallaProductId || "";

  if (!slugOrId) {
    return normalizedStoreUrl;
  }

  const template =
    platform === "zid"
      ? getZidConfig().productUrlTemplate
      : getSallaConfig().productUrlTemplate;

  if (!template) {
    return normalizedStoreUrl;
  }

  return applyTemplate(template, normalizedStoreUrl, slugOrId);
}
