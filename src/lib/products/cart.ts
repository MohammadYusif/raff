// src/lib/products/cart.ts
import { normalizeStoreUrl } from "@/lib/platform/store";

type ProductCartInput = {
  thumbnail: string | null;
  images: string[];
  externalProductUrl: string | null;
  sallaUrl: string | null;
  zidProductId: string | null;
  sallaProductId: string | null;
  slug: string;
  merchant?: {
    sallaStoreUrl: string | null;
    zidStoreUrl: string | null;
  } | null;
};

function getImageUrl(
  product: Pick<ProductCartInput, "thumbnail" | "images">
): string | null {
  if (product.thumbnail) return product.thumbnail;
  if (product.images && product.images.length > 0) {
    return product.images[0] ?? null;
  }
  return null;
}

function joinUrl(base: string, path: string): string {
  const trimmedBase = base.replace(/\/+$/, "");
  const trimmedPath = path.replace(/^\/+/, "");
  return `${trimmedBase}/${trimmedPath}`;
}

function getExternalUrl(product: ProductCartInput): string {
  if (product.externalProductUrl) return product.externalProductUrl;
  if (product.sallaUrl) return product.sallaUrl;

  const isZid = Boolean(product.zidProductId);
  const storeUrl = normalizeStoreUrl(
    isZid ? product.merchant?.zidStoreUrl : product.merchant?.sallaStoreUrl
  );

  if (!storeUrl) {
    return `/products/${encodeURIComponent(product.slug)}`;
  }

  const productId = isZid ? product.zidProductId : product.sallaProductId;
  if (productId) {
    const path = isZid ? `products/${productId}` : `product/${productId}`;
    return joinUrl(storeUrl, path);
  }

  return storeUrl;
}

export function addCartFields<T extends ProductCartInput>(
  product: T
): T & { imageUrl: string | null; externalUrl: string } {
  return {
    ...product,
    imageUrl: getImageUrl(product),
    externalUrl: getExternalUrl(product),
  };
}
