// src/lib/sync/sallaProducts.ts
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notifyProductOutOfStock } from "@/lib/services/notification.service";
import { slugify } from "@/lib/utils";
import {
  moneyAmount,
  sallaListProducts,
  toNumberOrNull,
  toStringOrNull,
  type SallaProduct,
} from "@/lib/integrations/salla/products";

const shouldDebug = process.env.RAFF_SALLA_SYNC_DEBUG === "true";
const debugLog = (message: string, details?: Record<string, unknown>) => {
  if (!shouldDebug) return;
  if (details) {
    console.log("[salla-sync]", message, details);
    return;
  }
  console.log("[salla-sync]", message);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const extractCurrency = (value: unknown): string | null => {
  if (!isRecord(value)) return null;
  return toStringOrNull(value.currency);
};

const extractImages = (product: SallaProduct): string[] => {
  const images = Array.isArray(product.images) ? product.images : [];
  const urls = images
    .map((image) => {
      if (typeof image === "string") return image;
      if (isRecord(image)) return toStringOrNull(image.url);
      return null;
    })
    .filter((url): url is string => Boolean(url));

  if (urls.length > 0) return urls;

  const fallback = toStringOrNull(product.main_image);
  return fallback ? [fallback] : [];
};

const toIntOrNull = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
  }
  return null;
};

const normalizeQuantity = (product: SallaProduct): number | null => {
  const productQty = toIntOrNull(product.quantity);
  const stockQty = toIntOrNull(product.stock_quantity);
  const skus = Array.isArray(product.skus) ? product.skus : [];
  let hasSkuQuantity = false;
  const skuQtySum = skus.reduce((sum, sku) => {
    const qty = toIntOrNull(sku.stock_quantity);
    if (qty === null) return sum;
    hasSkuQuantity = true;
    return sum + qty;
  }, 0);

  if (productQty !== null && productQty > 0) return productQty;
  if (stockQty !== null && stockQty > 0) return stockQty;
  if (hasSkuQuantity && skuQtySum > 0) return skuQtySum;

  if (productQty !== null) return productQty;
  if (stockQty !== null) return stockQty;
  return hasSkuQuantity ? skuQtySum : null;
};

const resolveSallaUrl = (product: SallaProduct): string | null => {
  return (
    toStringOrNull(product.url) ??
    toStringOrNull(product.urls?.customer) ??
    toStringOrNull(product.urls?.product)
  );
};

async function ensureUniqueSlug(
  baseSlug: string,
  existingId?: string | null
): Promise<string> {
  let candidate = baseSlug;
  let counter = 2;

  while (true) {
    const conflict = await prisma.product.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!conflict || (existingId && conflict.id === existingId)) {
      return candidate;
    }

    candidate = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

async function resolveProductSlug(
  merchantId: string,
  sallaProductId: string,
  name: string,
  existing?: { id: string; slug: string | null }
): Promise<string> {
  if (existing?.slug) return existing.slug;
  const safeName = slugify(name) || "product";
  const baseSlug = `${merchantId}-${sallaProductId}-${safeName}`;
  return ensureUniqueSlug(baseSlug);
}

const pickDefaultSkuId = (product: SallaProduct): string | null => {
  const skus = Array.isArray(product.skus) ? product.skus : [];
  if (skus.length === 0) return null;
  const preferred =
    skus.find((sku) => sku.is_default) ?? skus[0] ?? null;
  if (!preferred) return null;
  return toStringOrNull(preferred.id);
};

export async function syncSallaProductsForMerchant(
  merchantId: string,
  opts?: { perPage?: number }
): Promise<{
  syncedCount: number;
  pagesFetched: number;
  createdCount: number;
  updatedCount: number;
}> {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { id: true, userId: true, sallaAccessToken: true },
  });

  if (!merchant?.sallaAccessToken) {
    throw new Error("Salla access token missing");
  }

  const perPage = opts?.perPage ?? 50;
  let page = 1;
  let pagesFetched = 0;
  let syncedCount = 0;
  let createdCount = 0;
  let updatedCount = 0;
  let totalPages: number | null = null;

  while (true) {
    const { items, pagination } = await sallaListProducts(
      merchant.sallaAccessToken,
      { page, perPage }
    );
    pagesFetched += 1;

    totalPages = pagination.totalPages ?? totalPages;

    for (const product of items) {
      const rawProductId = product.id;
      const sallaProductId = toStringOrNull(rawProductId);
      if (!sallaProductId) {
        debugLog("skip-product", { reason: "missing-id", rawProductId });
        continue;
      }

      const title = toStringOrNull(product.name) ?? "";
      const description = toStringOrNull(product.description);
      const priceAmount =
        moneyAmount(product.price) ?? toNumberOrNull(product.price) ?? 0;
      const currency =
        extractCurrency(product.price) ??
        extractCurrency(product.sale_price) ??
        "SAR";
      const regularAmount =
        moneyAmount(product.regular_price) ??
        toNumberOrNull(product.regular_price);
      const originalPrice =
        regularAmount !== null && regularAmount > 0 ? regularAmount : null;
      const images = extractImages(product);
      const thumbnail =
        toStringOrNull(product.thumbnail) ??
        toStringOrNull(product.main_image) ??
        images[0] ??
        null;
      const sallaUrl = resolveSallaUrl(product);
      // Quantity: prefer product.quantity, fallback to sum of sku.stock_quantity.
      const quantity = normalizeQuantity(product);
      const inStock = quantity === null ? true : quantity > 0;
      const baseIsActive =
        typeof product.is_available === "boolean"
          ? product.is_available
          : typeof product.status === "string"
          ? product.status.trim().toLowerCase() !== "hidden"
          : true;
      const isActive = baseIsActive && (quantity === null || quantity > 0);

      const existing = await prisma.product.findUnique({
        where: {
          sallaProductId_merchantId: { sallaProductId, merchantId },
        },
        select: { id: true, slug: true, inStock: true },
      });

      const slug = await resolveProductSlug(
        merchantId,
        sallaProductId,
        title,
        existing ?? undefined
      );

      const sallaVariantId = pickDefaultSkuId(product);
      const data = {
        title,
        description: description ?? null,
        price: new Prisma.Decimal(priceAmount),
        currency,
        originalPrice:
          originalPrice !== null ? new Prisma.Decimal(originalPrice) : null,
        thumbnail,
        images,
        sallaProductId,
        sallaVariantId,
        sallaUrl: sallaUrl ?? null,
        externalProductUrl: sallaUrl ?? null,
        merchantId,
        isActive,
        inStock,
        quantity,
        slug,
      };

      const savedProduct = await prisma.product.upsert({
        where: {
          sallaProductId_merchantId: { sallaProductId, merchantId },
        },
        create: data,
        update: data,
        select: { id: true },
      });

      if (existing?.id) {
        updatedCount += 1;
      } else {
        createdCount += 1;
      }
      syncedCount += 1;

      if (
        quantity === 0 &&
        merchant.userId &&
        existing?.id &&
        existing.inStock !== false
      ) {
        await notifyProductOutOfStock(
          merchant.userId,
          savedProduct.id,
          title || "Product"
        );
      }
    }

    const currentPage = pagination.currentPage ?? page;
    const hasNextLink = Boolean(pagination.links?.next);

    if (typeof totalPages === "number") {
      if (currentPage >= totalPages) break;
      page = currentPage + 1;
      continue;
    }

    if (!hasNextLink) break;
    page = currentPage + 1;
  }

  await prisma.merchant.update({
    where: { id: merchantId },
    data: { lastSyncAt: new Date() },
  });

  debugLog("sync-summary", {
    syncedCount,
    pagesFetched,
    createdCount,
    updatedCount,
  });
  return { syncedCount, pagesFetched, createdCount, updatedCount };
}

export async function sallaSyncSanityCheckSummary(
  merchantId: string
): Promise<string> {
  const summary = await syncSallaProductsForMerchant(merchantId, {
    perPage: 1,
  });
  return (
    "syncSallaProductsForMerchant => " +
    `syncedCount=${summary.syncedCount}, ` +
    `pagesFetched=${summary.pagesFetched}, ` +
    `created=${summary.createdCount}, updated=${summary.updatedCount}`
  );
}
