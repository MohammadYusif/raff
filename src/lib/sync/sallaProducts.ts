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
import {
  ensureSallaAccessToken,
  refreshSallaAccessToken,
} from "@/lib/services/salla.service";
import type { SallaRequestOptions } from "@/lib/integrations/salla/client";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("salla-sync");

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

type SallaCategoryPayload = {
  id?: string | number;
  name?: string;
  name_ar?: string;
};

function pickSallaCategory(
  product: SallaProduct
): { externalId: string; name: string; nameAr: string | null } | null {
  const categories = Array.isArray(product.categories) ? product.categories : [];
  const primary =
    (categories[0] as SallaCategoryPayload | undefined) ??
    (product.category as SallaCategoryPayload | undefined) ??
    null;
  if (!primary) return null;

  const externalId = toStringOrNull(primary.id);
  if (!externalId) return null;

  const name =
    toStringOrNull(primary.name) ??
    toStringOrNull(primary.name_ar) ??
    "Category";
  const nameAr = toStringOrNull(primary.name_ar);

  return { externalId, name, nameAr };
}

async function upsertSallaCategory(
  merchantId: string,
  category: { externalId: string; name: string; nameAr: string | null }
): Promise<{ id: string; slug: string; externalId: string }> {
  const safeName = slugify(category.name) || "category";
  // Include merchant ID to prevent collisions between merchants
  const slug = `${merchantId}-${safeName}`;

  const saved = await prisma.category.upsert({
    where: { slug },
    create: {
      name: category.name,
      nameAr: category.nameAr,
      slug,
      description: null,
      descriptionAr: null,
      icon: null,
      image: null,
      isActive: true,
      parentId: null,
    },
    update: {
      name: category.name,
      nameAr: category.nameAr,
      isActive: true,
    },
    select: { id: true, slug: true },
  });

  return { id: saved.id, slug: saved.slug, externalId: category.externalId };
}

async function ensureUniqueSlug(
  baseSlug: string,
  existingId?: string | null
): Promise<string> {
  for (let counter = 1; counter < 50; counter += 1) {
    const candidate =
      counter === 1 ? baseSlug : `${baseSlug}-${counter}`;
    const conflict = await prisma.product.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!conflict || (existingId && conflict.id === existingId)) {
      return candidate;
    }
  }
  throw new Error("Failed to generate unique slug");
}

async function resolveProductSlug(
  merchantId: string,
  sallaProductId: string,
  name: string,
  existing?: { id: string; slug: string | null }
): Promise<string> {
  if (existing?.slug) return existing.slug;
  const safeName = slugify(name) || "product";
  // Include merchant ID to prevent collisions between merchants
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
    select: {
      id: true,
      userId: true,
      sallaAccessToken: true,
      sallaRefreshToken: true,
      sallaTokenExpiry: true,
    },
  });

  if (!merchant?.sallaAccessToken) {
    throw new Error("Salla access token missing");
  }

  const tokens = await ensureSallaAccessToken({
    id: merchant.id,
    sallaAccessToken: merchant.sallaAccessToken,
    sallaRefreshToken: merchant.sallaRefreshToken,
    sallaTokenExpiry: merchant.sallaTokenExpiry,
    sallaStoreId: null,
    sallaStoreUrl: null,
  });

  let currentAccessToken = tokens.accessToken || merchant.sallaAccessToken;
  let currentRefreshToken = tokens.refreshToken || merchant.sallaRefreshToken;
  const isDev = process.env.NODE_ENV !== "production";

  if (!currentAccessToken) {
    throw new Error("Salla access token missing");
  }

  const requestOptions: SallaRequestOptions = {
    onUnauthorized: async () => {
      const refreshed = await refreshSallaAccessToken({
        id: merchant.id,
        sallaRefreshToken: currentRefreshToken,
      });
      currentAccessToken = refreshed.accessToken;
      currentRefreshToken = refreshed.refreshToken;
      return refreshed.accessToken;
    },
    onRateLimit: (info) => {
      if (isDev) {
        console.warn("[salla-products] rate-limit", info);
      }
    },
  };

  const perPage = opts?.perPage ?? 50;
  let page = 1;
  let pagesFetched = 0;
  let syncedCount = 0;
  let createdCount = 0;
  let updatedCount = 0;
  let categoriesUpserted = 0;
  const categoryCache = new Map<string, { id: string; slug: string; externalId: string }>();
  const categorySamples: Array<{ slug: string; id: string; externalId: string }> = [];
  let totalPages: number | null = null;

  while (true) {
    const { items, pagination } = await sallaListProducts(
      currentAccessToken,
      { page, perPage },
      requestOptions
    );
    pagesFetched += 1;

    totalPages = pagination.totalPages ?? totalPages;

    for (const product of items) {
      const rawProductId = product.id;
      const sallaProductId = toStringOrNull(rawProductId);
      if (!sallaProductId) {
        logger.debug("skip-product", { reason: "missing-id", rawProductId });
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

      const categoryInfo = pickSallaCategory(product);
      let categoryId: string | null = null;
      if (categoryInfo) {
        const safeName = slugify(categoryInfo.name) || "category";
        const categorySlug = `salla-${merchantId}-${categoryInfo.externalId}-${safeName}`;
        const cached = categoryCache.get(categorySlug);
        if (cached) {
          categoryId = cached.id;
        } else {
          const savedCategory = await upsertSallaCategory(
            merchantId,
            categoryInfo
          );
          categoryId = savedCategory.id;
          categoryCache.set(categorySlug, savedCategory);
          categoriesUpserted += 1;
          if (categorySamples.length < 5) {
            categorySamples.push({
              slug: savedCategory.slug,
              id: savedCategory.id,
              externalId: savedCategory.externalId,
            });
          }
        }
      }

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
        categoryId,
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

  logger.debug("sync-summary", {
    syncedCount,
    pagesFetched,
    createdCount,
    updatedCount,
    categoriesUpserted,
    categorySamples,
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
