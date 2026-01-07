// src/lib/services/zid.service.ts
// PURPOSE: Zid API integration service for merchant product sync

import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { getZidConfig } from "@/lib/platform/config";
import { buildExternalProductUrl } from "@/lib/platform/products";
import { normalizeStoreUrl } from "@/lib/platform/store";
import { fetchWithTimeout } from "@/lib/platform/fetch";

const shouldDebugSync = process.env.RAFF_SYNC_DEBUG === "true";
const debugSyncLog = (message: string, details?: Record<string, unknown>) => {
  if (!shouldDebugSync) return;
  if (details) {
    console.log("[zid-sync]", message, details);
    return;
  }
  console.log("[zid-sync]", message);
};

interface ZidConfig {
  accessToken: string;
  storeId?: string | null;
  managerToken?: string | null;
}

interface ZidProduct {
  id: string;
  uuid: string;
  name: string;
  description?: string;
  price: number;
  compare_price?: number;
  sku?: string;
  quantity?: number;
  status: string;
  images?: Array<{ url: string; position: number }>;
  categories?: Array<{ id: string; name: string }>;
}

interface ZidCategory {
  id: string;
  uuid: string;
  name: string;
  description?: string;
  parent_id?: string;
  image?: string;
}

interface ZidPaginatedResponse<T> {
  products?: T[];
  categories?: T[];
  pagination: {
    count: number;
    total: number;
    per_page: number;
    current_page: number;
    total_pages: number;
  };
}

export class ZidService {
  private baseUrl: string;
  private accessToken: string;
  private storeId?: string | null;
  private managerToken?: string | null;

  constructor(config: ZidConfig) {
    const zidConfig = getZidConfig();
    this.baseUrl = zidConfig.apiBaseUrl;
    this.accessToken = config.accessToken;
    this.storeId = config.storeId;
    this.managerToken = config.managerToken;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      Accept: "application/json",
    };

    if (this.managerToken) {
      headers["X-MANAGER-TOKEN"] = this.managerToken;
    }

    return headers;
  }

  /**
   * Fetch paginated products from Zid store
   */
  async fetchProducts(
    page: number = 1,
    perPage: number = 50
  ): Promise<ZidPaginatedResponse<ZidProduct>> {
    try {
      debugSyncLog("fetch-products", { page, perPage });
      const response = await fetchWithTimeout(
        `${this.baseUrl}/managers/store/products?page=${page}&per_page=${perPage}`,
        {
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        debugSyncLog("fetch-products-error", { status: response.status });
        throw new Error(`Zid API error: ${response.status}`);
      }

      const data = await response.json();
      const products = data.products || [];
      debugSyncLog("fetch-products-result", {
        page,
        count: Array.isArray(products) ? products.length : 0,
        pagination: data.pagination || null,
      });

      return {
        products,
        pagination: data.pagination || {
          count: 0,
          total: 0,
          per_page: perPage,
          current_page: page,
          total_pages: 1,
        },
      };
    } catch (error) {
      console.error("Error fetching Zid products:", error);
      throw error;
    }
  }

  /**
   * Fetch single product by ID
   */
  async fetchProduct(productId: string): Promise<ZidProduct | null> {
    try {
      debugSyncLog("fetch-product", { productId });
      const response = await fetchWithTimeout(
        `${this.baseUrl}/managers/store/products/${productId}`,
        {
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        debugSyncLog("fetch-product-error", {
          productId,
          status: response.status,
        });
        throw new Error(`Zid API error: ${response.status}`);
      }

      const data = await response.json();
      return data.product || null;
    } catch (error) {
      console.error("Error fetching Zid product:", error);
      throw error;
    }
  }

  /**
   * Fetch all categories from Zid store
   */
  async fetchCategories(): Promise<ZidCategory[]> {
    try {
      debugSyncLog("fetch-categories", {});
      const response = await fetchWithTimeout(
        `${this.baseUrl}/managers/store/categories`,
        {
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        debugSyncLog("fetch-categories-error", { status: response.status });
        throw new Error(`Zid API error: ${response.status}`);
      }

      const data = await response.json();
      const categories = data.categories || [];
      debugSyncLog("fetch-categories-result", {
        count: Array.isArray(categories) ? categories.length : 0,
      });
      return categories;
    } catch (error) {
      console.error("Error fetching Zid categories:", error);
      throw error;
    }
  }

  /**
   * Fetch store manager profile
   */
  async fetchStoreProfile(): Promise<{
    id: string;
    name: string;
    email: string;
    domain: string;
  } | null> {
    try {
      const response = await fetchWithTimeout(
        `${this.baseUrl}/managers/account/profile`,
        {
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(`Zid API error: ${response.status}`);
      }

      const data = await response.json();
      return data.manager || null;
    } catch (error) {
      console.error("Error fetching Zid store profile:", error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    try {
      const zidConfig = getZidConfig();
      const body = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: zidConfig.clientId,
        client_secret: zidConfig.clientSecret,
      });

      const response = await fetchWithTimeout(zidConfig.tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const data = await response.json();

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
      };
    } catch (error) {
      console.error("Error refreshing Zid token:", error);
      throw error;
    }
  }
}

type ZidMerchantAuth = {
  id: string;
  zidAccessToken: string | null;
  zidRefreshToken: string | null;
  zidTokenExpiry: Date | null;
  zidManagerToken: string | null;
  zidStoreId: string | null;
  zidStoreUrl: string | null;
};

function isTokenExpired(tokenExpiry: Date | null): boolean {
  if (!tokenExpiry) return false;
  return tokenExpiry.getTime() <= Date.now();
}

async function ensureZidAccessToken(merchant: ZidMerchantAuth) {
  if (!isTokenExpired(merchant.zidTokenExpiry)) {
    return {
      accessToken: merchant.zidAccessToken,
      refreshToken: merchant.zidRefreshToken,
      tokenExpiry: merchant.zidTokenExpiry,
    };
  }

  if (!merchant.zidRefreshToken) {
    throw new Error("Zid refresh token missing");
  }

  const refreshed = await ZidService.refreshToken(merchant.zidRefreshToken);
  const tokenExpiry = new Date(Date.now() + refreshed.expiresIn * 1000);

  await prisma.merchant.update({
    where: { id: merchant.id },
    data: {
      zidAccessToken: refreshed.accessToken,
      zidRefreshToken: refreshed.refreshToken,
      zidTokenExpiry: tokenExpiry,
    },
  });

  return {
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
    tokenExpiry,
  };
}

function resolveZidProductUrl(product: ZidProduct): string | null {
  const productAny = product as unknown as Record<string, unknown>;
  const url =
    (productAny?.url as string) ||
    (productAny?.urls as Record<string, string> | undefined)?.product ||
    null;
  return url;
}

type NormalizedTag = { name: string; slug: string };

function normalizeTags(tags: Array<string | null | undefined>): NormalizedTag[] {
  const seen = new Map<string, string>();

  for (const tag of tags) {
    if (!tag) continue;
    const trimmed = tag.trim();
    if (!trimmed) continue;
    const slug = slugify(trimmed);
    if (!slug || seen.has(slug)) continue;
    seen.set(slug, trimmed);
  }

  return Array.from(seen, ([slug, name]) => ({ slug, name }));
}

function buildProductTagsInput(tags: Array<string | null | undefined>) {
  const normalized = normalizeTags(tags);
  if (normalized.length === 0) return undefined;

  return {
    create: normalized.map((tag) => ({
      tag: {
        connectOrCreate: {
          where: { slug: tag.slug },
          create: {
            name: tag.name,
            nameAr: null,
            slug: tag.slug,
            isActive: true,
          },
        },
      },
    })),
  };
}

type ZidCategoryPayload = {
  id?: string | number;
  name?: string;
};

function pickZidCategory(
  product: ZidProduct
): { externalId: string; name: string } | null {
  const categories = Array.isArray(product.categories) ? product.categories : [];
  const primary = categories[0] as ZidCategoryPayload | undefined;
  if (!primary) return null;

  const externalId =
    primary.id !== null && primary.id !== undefined ? String(primary.id) : "";
  if (!externalId) return null;

  const name = primary.name || "Category";
  return { externalId, name };
}

async function upsertCategory(
  merchantId: string,
  category: ZidCategory,
  counters: { created: number; updated: number }
): Promise<string | null> {
  const safeName = slugify(category.name || "") || "category";
  const slug = `zid-${merchantId}-${category.id}-${safeName}`;

  const existing = await prisma.category.findUnique({
    where: { slug },
  });

  if (!existing) {
    const created = await prisma.category.create({
      data: {
        name: category.name,
        nameAr: null,
        slug,
        description: category.description || null,
        descriptionAr: null,
        icon: null,
        image: category.image || null,
        isActive: true,
      },
    });
    counters.created += 1;
    return created.id;
  }

  const updated = await prisma.category.update({
    where: { id: existing.id },
    data: {
      name: category.name,
      description: category.description || existing.description,
      image: category.image || existing.image,
      isActive: true,
    },
  });
  counters.updated += 1;
  return updated.id;
}

async function upsertZidCategoryFromProduct(
  merchantId: string,
  category: { externalId: string; name: string }
): Promise<{ id: string; slug: string; externalId: string }> {
  const safeName = slugify(category.name) || "category";
  const slug = `zid-${merchantId}-${category.externalId}-${safeName}`;

  const saved = await prisma.category.upsert({
    where: { slug },
    create: {
      name: category.name,
      nameAr: null,
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
  name: string,
  zidProductId: string,
  existing?: { id: string; slug: string | null }
): Promise<string> {
  if (existing?.slug) return existing.slug;
  const safeName = slugify(name) || "product";
  const baseSlug = `zid-${merchantId}-${zidProductId}-${safeName}`;
  return ensureUniqueSlug(baseSlug, existing?.id);
}

/**
 * Sync products from Zid to Raff database
 */
export async function syncZidProducts(
  merchant: ZidMerchantAuth
): Promise<{
  productsCreated: number;
  productsUpdated: number;
  categoriesCreated: number;
  categoriesUpdated: number;
}> {
  if (!merchant.zidAccessToken) {
    throw new Error("Zid access token missing");
  }

  debugSyncLog("sync-start", {
    merchantId: merchant.id,
    storeId: merchant.zidStoreId,
    storeUrl: merchant.zidStoreUrl,
  });

  const tokens = await ensureZidAccessToken(merchant);
  const service = new ZidService({
    accessToken: tokens.accessToken || merchant.zidAccessToken,
    storeId: merchant.zidStoreId,
    managerToken: merchant.zidManagerToken,
  });

  let productsCreated = 0;
  let productsUpdated = 0;
  let categoriesCreated = 0;
  let categoriesUpdated = 0;

  const categoryCounters = {
    created: 0,
    updated: 0,
  };

  const categories = await service.fetchCategories();
  const categoryCache = new Map<
    string,
    { id: string; slug: string; externalId: string }
  >();
  let categoriesUpserted = 0;
  const categorySamples: Array<{ slug: string; id: string; externalId: string }> = [];

  for (const category of categories) {
    await upsertCategory(merchant.id, category, categoryCounters);
  }

  categoriesCreated = categoryCounters.created;
  categoriesUpdated = categoryCounters.updated;
  debugSyncLog("categories-synced", {
    created: categoriesCreated,
    updated: categoriesUpdated,
  });

  let page = 1;
  const perPage = 50;
  let totalPages = 1;

  while (page <= totalPages) {
    const response = await service.fetchProducts(page, perPage);
    const zidProducts = response.products || [];

    if (response.pagination?.total_pages) {
      totalPages = response.pagination.total_pages;
    }
    debugSyncLog("page-loaded", {
      page,
      perPage,
      count: zidProducts.length,
      totalPages,
    });

    for (const zidProduct of zidProducts) {
      const name = zidProduct.name || "";
      const rawZidProductId = zidProduct.id;
      const zidProductId =
        rawZidProductId !== null && rawZidProductId !== undefined
          ? String(rawZidProductId)
          : "";

      if (!name || !zidProductId) {
        debugSyncLog("skip-product", {
          reason: !name ? "missing-name" : "missing-id",
          rawId: rawZidProductId ?? null,
        });
        continue;
      }
      if (typeof rawZidProductId === "number") {
        debugSyncLog("normalized-product-id", {
          rawId: rawZidProductId,
          normalizedId: zidProductId,
        });
      }

      const existing = await prisma.product.findFirst({
        where: {
          merchantId: merchant.id,
          zidProductId,
        },
      });

      const slug = await resolveProductSlug(
        merchant.id,
        name,
        zidProductId,
        existing ?? undefined
      );

      const categoryInfo = pickZidCategory(zidProduct);
      let categoryId: string | null = null;
      if (categoryInfo) {
        const safeName = slugify(categoryInfo.name) || "category";
        const categorySlug = `zid-${merchant.id}-${categoryInfo.externalId}-${safeName}`;
        const cached = categoryCache.get(categorySlug);
        if (cached) {
          categoryId = cached.id;
        } else {
          const savedCategory = await upsertZidCategoryFromProduct(
            merchant.id,
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

      const images =
        zidProduct.images?.map((image) => image.url).filter(Boolean) || [];

      const normalizedStatus = zidProduct.status?.toLowerCase() || "";
      const isActive =
        normalizedStatus === "active" ||
        normalizedStatus === "published" ||
        normalizedStatus === "" ||
        normalizedStatus === "available";
      const inStock =
        typeof zidProduct.quantity === "number"
          ? zidProduct.quantity > 0
          : true;

      const storeUrl = normalizeStoreUrl(merchant.zidStoreUrl);
      const externalProductUrl = buildExternalProductUrl({
        platform: "zid",
        product: {
          slug,
          zidProductId,
        },
        storeUrl,
        providedUrl: resolveZidProductUrl(zidProduct),
      });
      const sallaUrl = existing?.sallaUrl || undefined;
      const sallaProductId = existing?.sallaProductId || undefined;
      const tagNames =
        zidProduct.categories?.map((category) => category.name) || [];
      const productTags = buildProductTagsInput(tagNames);

      const productData = {
        title: zidProduct.name,
        titleAr: null,
        description: zidProduct.description || null,
        descriptionAr: null,
        price: zidProduct.price,
        originalPrice: zidProduct.compare_price || null,
        currency: "SAR",
        images,
        thumbnail: images[0] || null,
        categoryId,
        zidProductId,
        sallaProductId,
        sallaUrl,
        externalProductUrl: externalProductUrl || undefined,
        merchantId: merchant.id,
        isActive,
        inStock,
        quantity: zidProduct.quantity || null,
        slug,
      };

      if (existing) {
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            ...productData,
            productTags: {
              deleteMany: {},
              ...(productTags ? { create: productTags.create } : {}),
            },
          },
        });
        productsUpdated += 1;
      } else {
        await prisma.product.create({
          data: {
            ...productData,
            ...(productTags ? { productTags } : {}),
          },
        });
        productsCreated += 1;
      }
    }

    page += 1;
  }

  debugSyncLog("sync-complete", {
    merchantId: merchant.id,
    productsCreated,
    productsUpdated,
    categoriesCreated,
    categoriesUpdated,
    categoriesUpserted,
    categorySamples,
  });
  return {
    productsCreated,
    productsUpdated,
    categoriesCreated,
    categoriesUpdated,
  };
}

export async function syncZidProductById(
  merchant: ZidMerchantAuth,
  productId: string
): Promise<{ created: boolean; updated: boolean }> {
  if (!merchant.zidAccessToken) {
    throw new Error("Zid access token missing");
  }

  debugSyncLog("sync-single-start", {
    merchantId: merchant.id,
    productId,
  });
  const tokens = await ensureZidAccessToken(merchant);
  const service = new ZidService({
    accessToken: tokens.accessToken || merchant.zidAccessToken,
    storeId: merchant.zidStoreId,
    managerToken: merchant.zidManagerToken,
  });

  const zidProduct = await service.fetchProduct(productId);
  if (!zidProduct) {
    return { created: false, updated: false };
  }

  const name = zidProduct.name || "";
  const rawZidProductId = zidProduct.id;
  const zidProductId =
    rawZidProductId !== null && rawZidProductId !== undefined
      ? String(rawZidProductId)
      : "";

  if (!name || !zidProductId) {
    debugSyncLog("skip-product", {
      reason: !name ? "missing-name" : "missing-id",
      rawId: rawZidProductId ?? null,
    });
    return { created: false, updated: false };
  }
  if (typeof rawZidProductId === "number") {
    debugSyncLog("normalized-product-id", {
      rawId: rawZidProductId,
      normalizedId: zidProductId,
    });
  }

  const existing = await prisma.product.findFirst({
    where: {
      merchantId: merchant.id,
      zidProductId,
    },
  });

  const categoryInfo = pickZidCategory(zidProduct);
  let categoryId: string | null = null;
  if (categoryInfo) {
    const savedCategory = await upsertZidCategoryFromProduct(
      merchant.id,
      categoryInfo
    );
    categoryId = savedCategory.id;
    debugSyncLog("category-upserted", {
      merchantId: merchant.id,
      categorySlug: savedCategory.slug,
      categoryId: savedCategory.id,
      externalId: savedCategory.externalId,
    });
  }

  const slug = await resolveProductSlug(
    merchant.id,
    name,
    zidProductId,
    existing ?? undefined
  );

  const images =
    zidProduct.images?.map((image) => image.url).filter(Boolean) || [];

  const normalizedStatus = zidProduct.status?.toLowerCase() || "";
  const isActive =
    normalizedStatus === "active" ||
    normalizedStatus === "published" ||
    normalizedStatus === "" ||
    normalizedStatus === "available";
  const inStock =
    typeof zidProduct.quantity === "number" ? zidProduct.quantity > 0 : true;

  const storeUrl = normalizeStoreUrl(merchant.zidStoreUrl);
  const externalProductUrl = buildExternalProductUrl({
    platform: "zid",
    product: {
      slug,
      zidProductId,
    },
    storeUrl,
    providedUrl: resolveZidProductUrl(zidProduct),
  });
  const sallaUrl = existing?.sallaUrl || undefined;
  const sallaProductId = existing?.sallaProductId || undefined;
  const tagNames = zidProduct.categories?.map((category) => category.name) || [];
  const productTags = buildProductTagsInput(tagNames);

  const productData = {
    title: zidProduct.name,
    titleAr: null,
    description: zidProduct.description || null,
    descriptionAr: null,
    price: zidProduct.price,
    originalPrice: zidProduct.compare_price || null,
    currency: "SAR",
    images,
    thumbnail: images[0] || null,
    categoryId,
    zidProductId,
    sallaProductId,
    sallaUrl,
    externalProductUrl: externalProductUrl || undefined,
    merchantId: merchant.id,
    isActive,
    inStock,
    quantity: zidProduct.quantity || null,
    slug,
  };

  if (existing) {
    await prisma.product.update({
      where: { id: existing.id },
      data: {
        ...productData,
        productTags: {
          deleteMany: {},
          ...(productTags ? { create: productTags.create } : {}),
        },
      },
    });
    debugSyncLog("sync-single-updated", {
      merchantId: merchant.id,
      productId: zidProductId,
    });
    return { created: false, updated: true };
  }

  await prisma.product.create({
    data: {
      ...productData,
      ...(productTags ? { productTags } : {}),
    },
  });
  debugSyncLog("sync-single-created", {
    merchantId: merchant.id,
    productId: zidProductId,
  });
  return { created: true, updated: false };
}

export async function deactivateZidProduct(
  merchantId: string,
  zidProductId: string
): Promise<void> {
  await prisma.product.updateMany({
    where: {
      merchantId,
      zidProductId,
    },
    data: {
      isActive: false,
      inStock: false,
    },
  });
}
