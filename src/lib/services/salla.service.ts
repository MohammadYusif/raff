// src/lib/services/salla.service.ts
// PURPOSE: Salla API integration service for merchant product sync

import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { getSallaConfig } from "@/lib/platform/config";
import { buildExternalProductUrl } from "@/lib/platform/products";
import { normalizeStoreUrl } from "@/lib/platform/store";
import { fetchWithTimeout } from "@/lib/platform/fetch";

const shouldDebugSync = process.env.RAFF_SYNC_DEBUG === "true";
const debugSyncLog = (message: string, details?: Record<string, unknown>) => {
  if (!shouldDebugSync) return;
  if (details) {
    console.log("[salla-sync]", message, details);
    return;
  }
  console.log("[salla-sync]", message);
};

type RateLimitInfo = {
  url: string;
  retryAfterMs: number | null;
  attempt: number;
};

interface SallaConfig {
  accessToken: string;
  refreshAccessToken?: () => Promise<string | null>;
  onRateLimit?: (info: RateLimitInfo) => void;
}

interface SallaProduct {
  id: string | number;
  name?: string;
  name_ar?: string;
  description?: string;
  description_ar?: string;
  price?: number | { amount?: number | string; currency?: string };
  sale_price?: number | { amount?: number | string; currency?: string };
  quantity?: number;
  status?: string;
  sku?: string;
  slug?: string;
  images?: Array<{ url: string }>;
  urls?: { product?: string };
  url?: string;
  category?: { id?: string; name?: string; name_ar?: string };
  categories?: Array<{ id: string; name?: string; name_ar?: string }>;
}

interface SallaCategory {
  id: string;
  name?: string;
  name_ar?: string;
  description?: string;
  description_ar?: string;
  image?: string;
}

interface SallaPaginatedResponse<T> {
  products?: T[];
  categories?: T[];
  pagination?: {
    total_pages?: number;
    current_page?: number;
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

function extractPagination(
  data: Record<string, unknown>
): SallaPaginatedResponse<SallaProduct>["pagination"] {
  if (isRecord(data.pagination)) return data.pagination;
  const meta = isRecord(data.meta) ? data.meta : null;
  if (meta && isRecord(meta.pagination)) {
    return meta.pagination as SallaPaginatedResponse<SallaProduct>["pagination"];
  }
  return {};
}

function coerceSallaProduct(value: unknown): SallaProduct {
  if (!isRecord(value)) {
    throw new Error("Salla product payload missing");
  }
  const id = value.id;
  if (typeof id !== "string" && typeof id !== "number") {
    throw new Error("Salla product payload missing id");
  }
  return value as unknown as SallaProduct;
}

export class SallaService {
  private accessToken: string;
  private refreshAccessToken?: () => Promise<string | null>;
  private onRateLimit?: (info: RateLimitInfo) => void;

  constructor(config: SallaConfig) {
    this.accessToken = config.accessToken;
    this.refreshAccessToken = config.refreshAccessToken;
    this.onRateLimit = config.onRateLimit;
  }

  private getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      Accept: "application/json",
    };
  }

  private buildPagedUrl(url: string, page: number, perPage: number): string {
    const parsed = new URL(url);
    // TODO: Confirm pagination parameter names with Salla docs.
    parsed.searchParams.set("page", String(page));
    parsed.searchParams.set("per_page", String(perPage));
    return parsed.toString();
  }

  private async fetchJson<T>(url: string): Promise<T> {
    const maxAttempts = 2;
    let attempt = 0;

    while (attempt < maxAttempts) {
      const response = await fetchWithTimeout(url, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        if (response.status === 401 && this.refreshAccessToken && attempt === 0) {
          await response.body?.cancel();
          const refreshed = await this.refreshAccessToken();
          if (refreshed) {
            this.accessToken = refreshed;
            attempt += 1;
            continue;
          }
        }

        if (response.status === 429 && attempt + 1 < maxAttempts) {
          const retryAfter = response.headers.get("retry-after");
          let retryAfterMs: number | null = null;
          if (retryAfter) {
            const seconds = Number(retryAfter);
            if (!Number.isNaN(seconds)) {
              retryAfterMs = Math.min(Math.max(seconds * 1000, 0), 30000);
            } else {
              const dateMs = Date.parse(retryAfter);
              if (!Number.isNaN(dateMs)) {
                retryAfterMs = Math.min(
                  Math.max(dateMs - Date.now(), 0),
                  30000
                );
              }
            }
          }

          if (retryAfterMs === null) {
            retryAfterMs = Math.min(500 * Math.pow(2, attempt), 30000);
          }

          this.onRateLimit?.({
            url,
            retryAfterMs,
            attempt: attempt + 1,
          });
          await response.body?.cancel();
          await new Promise((resolve) => setTimeout(resolve, retryAfterMs));
          attempt += 1;
          continue;
        }

        const bodyText = await response.text();
        throw new Error(`Salla API error ${response.status}: ${bodyText}`);
      }

      const bodyText = await response.text();
      if (!bodyText) {
        throw new Error("Salla API empty response body");
      }
      try {
        return JSON.parse(bodyText) as T;
      } catch {
        throw new Error(`Salla API invalid JSON: ${bodyText}`);
      }
    }

    throw new Error("Salla API request failed after retries");
  }

  async fetchProducts(
    page: number = 1,
    perPage: number = 50
  ): Promise<SallaPaginatedResponse<SallaProduct>> {
    const sallaConfig = getSallaConfig();
    if (!sallaConfig.productsApiUrl) {
      throw new Error("Missing SALLA_PRODUCTS_API_URL");
    }

    const url = this.buildPagedUrl(sallaConfig.productsApiUrl, page, perPage);
    debugSyncLog("fetch-products", { page, perPage, url });
    const raw = await this.fetchJson<unknown>(url);
    if (!isRecord(raw)) {
      throw new Error("Salla products response not an object");
    }
    const productsRaw = raw.data ?? raw.products ?? raw.items ?? [];
    const products = Array.isArray(productsRaw)
      ? (productsRaw as SallaProduct[])
      : [];
    const pagination = extractPagination(raw);
    debugSyncLog("fetch-products-result", {
      page,
      count: products.length,
      pagination,
    });
    return {
      products,
      pagination,
    };
  }

  async fetchProduct(productId: string): Promise<SallaProduct | null> {
    const sallaConfig = getSallaConfig();
    if (!sallaConfig.productApiUrlTemplate) {
      throw new Error("Missing SALLA_PRODUCT_API_URL_TEMPLATE");
    }

    const url = sallaConfig.productApiUrlTemplate.replace("{id}", productId);
    debugSyncLog("fetch-product", { productId, url });
    try {
      const raw = await this.fetchJson<unknown>(url);
      if (!isRecord(raw)) {
        throw new Error("Salla product response not an object");
      }
      const candidate = raw.data ?? raw.product ?? raw;
      return coerceSallaProduct(candidate);
    } catch (error) {
      if (error instanceof Error && error.message.includes("404")) {
        return null;
      }
      debugSyncLog("fetch-product-error", { productId });
      throw error;
    }
  }

  async fetchCategories(): Promise<SallaCategory[]> {
    const sallaConfig = getSallaConfig();
    if (!sallaConfig.categoriesApiUrl) {
      throw new Error("Missing SALLA_CATEGORIES_API_URL");
    }

    debugSyncLog("fetch-categories", { url: sallaConfig.categoriesApiUrl });
    const raw = await this.fetchJson<unknown>(sallaConfig.categoriesApiUrl);
    if (!isRecord(raw)) {
      throw new Error("Salla categories response not an object");
    }
    const categoriesRaw = raw.data ?? raw.categories ?? [];
    const categories = Array.isArray(categoriesRaw)
      ? (categoriesRaw as SallaCategory[])
      : [];
    debugSyncLog("fetch-categories-result", {
      count: categories.length,
    });
    return categories;
  }

  static async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const sallaConfig = getSallaConfig();
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: sallaConfig.clientId,
      client_secret: sallaConfig.clientSecret,
    });

    const response = await fetchWithTimeout(sallaConfig.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!response.ok) {
      throw new Error(`Salla token refresh failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  }
}

type SallaMerchantAuth = {
  id: string;
  sallaAccessToken: string | null;
  sallaRefreshToken: string | null;
  sallaTokenExpiry: Date | null;
  sallaStoreId: string | null;
  sallaStoreUrl: string | null;
};

function isTokenExpired(tokenExpiry: Date | null): boolean {
  if (!tokenExpiry) return false;
  return tokenExpiry.getTime() <= Date.now();
}

export async function ensureSallaAccessToken(merchant: SallaMerchantAuth) {
  if (!isTokenExpired(merchant.sallaTokenExpiry)) {
    return {
      accessToken: merchant.sallaAccessToken,
      refreshToken: merchant.sallaRefreshToken,
      tokenExpiry: merchant.sallaTokenExpiry,
    };
  }

  if (!merchant.sallaRefreshToken) {
    throw new Error("Salla refresh token missing");
  }

  const refreshed = await SallaService.refreshToken(merchant.sallaRefreshToken);
  const tokenExpiry = new Date(Date.now() + refreshed.expiresIn * 1000);

  await prisma.merchant.update({
    where: { id: merchant.id },
    data: {
      sallaAccessToken: refreshed.accessToken,
      sallaRefreshToken: refreshed.refreshToken,
      sallaTokenExpiry: tokenExpiry,
    },
  });

  return {
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
    tokenExpiry,
  };
}

export async function refreshSallaAccessToken(merchant: {
  id: string;
  sallaRefreshToken: string | null;
}): Promise<{ accessToken: string; refreshToken: string; tokenExpiry: Date }> {
  if (!merchant.sallaRefreshToken) {
    throw new Error("Salla refresh token missing");
  }

  const refreshed = await SallaService.refreshToken(merchant.sallaRefreshToken);
  const tokenExpiry = new Date(Date.now() + refreshed.expiresIn * 1000);

  await prisma.merchant.update({
    where: { id: merchant.id },
    data: {
      sallaAccessToken: refreshed.accessToken,
      sallaRefreshToken: refreshed.refreshToken,
      sallaTokenExpiry: tokenExpiry,
    },
  });

  return {
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
    tokenExpiry,
  };
}

function resolveSallaProductUrl(product: SallaProduct): string | null {
  return product.url || product.urls?.product || null;
}

const INACTIVE_SALLA_STATUSES = new Set([
  "inactive",
  "draft",
  "archived",
  "deleted",
  "hidden",
  "disabled",
  "unavailable",
  "unlisted",
]);

function isSallaProductActive(status?: string | null): boolean {
  if (!status) return true;
  const normalized = String(status).trim().toLowerCase();
  if (!normalized) return true;
  return !INACTIVE_SALLA_STATUSES.has(normalized);
}

function extractNumericAmount(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value === "object" && value) {
    const record = value as Record<string, unknown>;
    if ("amount" in record) {
      return extractNumericAmount(record.amount);
    }
    if ("value" in record) {
      return extractNumericAmount(record.value);
    }
  }
  return null;
}

function extractCurrency(value: unknown): string | null {
  if (typeof value !== "object" || !value) return null;
  const record = value as Record<string, unknown>;
  return typeof record.currency === "string" ? record.currency : null;
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

  const externalId =
    primary.id !== null && primary.id !== undefined ? String(primary.id) : "";
  if (!externalId) return null;

  const name = primary.name || primary.name_ar || "Category";
  const nameAr = primary.name_ar || null;

  return { externalId, name, nameAr };
}

async function upsertCategory(
  merchantId: string,
  category: SallaCategory,
  counters: { created: number; updated: number }
): Promise<string | null> {
  const name = category.name || category.name_ar || "";
  const safeName = slugify(name) || "category";
  const slug = `salla-${merchantId}-${category.id}-${safeName}`;
  if (!slug) return null;

  const existing = await prisma.category.findUnique({
    where: { slug },
  });

  if (!existing) {
    const created = await prisma.category.create({
      data: {
        name: name,
        nameAr: category.name_ar || null,
        slug,
        description: category.description || null,
        descriptionAr: category.description_ar || null,
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
      name: name,
      nameAr: category.name_ar || existing.nameAr,
      description: category.description || existing.description,
      descriptionAr: category.description_ar || existing.descriptionAr,
      image: category.image || existing.image,
      isActive: true,
    },
  });
  counters.updated += 1;
  return updated.id;
}

async function upsertSallaCategoryFromProduct(
  merchantId: string,
  category: { externalId: string; name: string; nameAr: string | null }
): Promise<{ id: string; slug: string; externalId: string }> {
  const safeName = slugify(category.name) || "category";
  const slug = `salla-${merchantId}-${category.externalId}-${safeName}`;

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
  name: string,
  sallaProductId: string,
  existing?: { id: string; slug: string | null }
): Promise<string> {
  if (existing?.slug) return existing.slug;
  const safeName = slugify(name) || "product";
  const baseSlug = `salla-${merchantId}-${sallaProductId}-${safeName}`;
  return ensureUniqueSlug(baseSlug, existing?.id);
}

export async function syncSallaProducts(merchant: SallaMerchantAuth): Promise<{
  productsCreated: number;
  productsUpdated: number;
  categoriesCreated: number;
  categoriesUpdated: number;
}> {
  if (!merchant.sallaAccessToken) {
    throw new Error("Salla access token missing");
  }

  debugSyncLog("sync-start", {
    merchantId: merchant.id,
    storeId: merchant.sallaStoreId,
    storeUrl: merchant.sallaStoreUrl,
  });

  const tokens = await ensureSallaAccessToken(merchant);
  let currentAccessToken = tokens.accessToken || merchant.sallaAccessToken;
  let currentRefreshToken = tokens.refreshToken || merchant.sallaRefreshToken;
  const isDev = process.env.NODE_ENV !== "production";

  const refreshAccessToken = async () => {
    const refreshed = await refreshSallaAccessToken({
      id: merchant.id,
      sallaRefreshToken: currentRefreshToken,
    });
    currentAccessToken = refreshed.accessToken;
    currentRefreshToken = refreshed.refreshToken;
    return refreshed.accessToken;
  };

  const service = new SallaService({
    accessToken: currentAccessToken || merchant.sallaAccessToken || "",
    refreshAccessToken,
    onRateLimit: (info) => {
      if (isDev) {
        console.warn("[salla-sync] rate-limit", info);
      }
    },
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
    const sallaProducts = response.products || [];

    if (response.pagination?.total_pages) {
      totalPages = response.pagination.total_pages;
    }
    debugSyncLog("page-loaded", {
      page,
      perPage,
      count: sallaProducts.length,
      totalPages,
    });

    for (const sallaProduct of sallaProducts) {
      const name =
        sallaProduct.name || sallaProduct.name_ar || sallaProduct.slug || "";
      const rawSallaProductId = sallaProduct.id;
      const sallaProductId =
        rawSallaProductId !== null && rawSallaProductId !== undefined
          ? String(rawSallaProductId)
          : "";

      if (!name || !sallaProductId) {
        debugSyncLog("skip-product", {
          reason: !name ? "missing-name" : "missing-id",
          rawId: rawSallaProductId ?? null,
        });
        continue;
      }
      if (typeof rawSallaProductId === "number") {
        debugSyncLog("normalized-product-id", {
          rawId: rawSallaProductId,
          normalizedId: sallaProductId,
        });
      }

      const existing = await prisma.product.findFirst({
        where: {
          merchantId: merchant.id,
          sallaProductId,
        },
      });

      const slug = await resolveProductSlug(
        merchant.id,
        name,
        sallaProductId,
        existing ?? undefined
      );

      const categoryInfo = pickSallaCategory(sallaProduct);
      let categoryId: string | null = null;
      if (categoryInfo) {
        const safeName = slugify(categoryInfo.name) || "category";
        const categorySlug = `salla-${merchant.id}-${categoryInfo.externalId}-${safeName}`;
        const cached = categoryCache.get(categorySlug);
        if (cached) {
          categoryId = cached.id;
        } else {
          const savedCategory = await upsertSallaCategoryFromProduct(
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
        sallaProduct.images?.map((image) => image.url).filter(Boolean) || [];

      const isActive = isSallaProductActive(sallaProduct.status);
      const inStock =
        typeof sallaProduct.quantity === "number"
          ? sallaProduct.quantity > 0
          : true;

      const storeUrl = normalizeStoreUrl(merchant.sallaStoreUrl);
      const externalProductUrl = buildExternalProductUrl({
        platform: "salla",
        product: {
          slug,
          sallaProductId,
        },
        storeUrl,
        providedUrl: resolveSallaProductUrl(sallaProduct),
      });
      const sallaUrl = resolveSallaProductUrl(sallaProduct) || undefined;
      const priceAmount = extractNumericAmount(sallaProduct.price);
      const salePriceAmount = extractNumericAmount(sallaProduct.sale_price);
      const currency =
        extractCurrency(sallaProduct.sale_price) ||
        extractCurrency(sallaProduct.price) ||
        "SAR";
      const hasSalePrice = salePriceAmount !== null;
      const effectivePrice = hasSalePrice
        ? salePriceAmount
        : priceAmount ?? 0;
      const originalPrice = hasSalePrice ? priceAmount ?? null : null;
      const tagNames = sallaProduct.sku ? [sallaProduct.sku] : [];
      const productTags = buildProductTagsInput(tagNames);

      const productData = {
        title: sallaProduct.name || sallaProduct.slug || sallaProductId,
        titleAr: sallaProduct.name_ar || null,
        description: sallaProduct.description || null,
        descriptionAr: sallaProduct.description_ar || null,
        price: effectivePrice,
        originalPrice,
        currency,
        images,
        thumbnail: images[0] || null,
        categoryId,
        sallaProductId,
        sallaUrl,
        externalProductUrl: externalProductUrl || undefined,
        merchantId: merchant.id,
        isActive,
        inStock,
        quantity: sallaProduct.quantity || null,
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

export async function syncSallaProductById(
  merchant: SallaMerchantAuth,
  productId: string
): Promise<{ created: boolean; updated: boolean }> {
  if (!merchant.sallaAccessToken) {
    throw new Error("Salla access token missing");
  }

  debugSyncLog("sync-single-start", {
    merchantId: merchant.id,
    productId,
  });
  const tokens = await ensureSallaAccessToken(merchant);
  let currentAccessToken = tokens.accessToken || merchant.sallaAccessToken;
  let currentRefreshToken = tokens.refreshToken || merchant.sallaRefreshToken;
  const isDev = process.env.NODE_ENV !== "production";
  const refreshAccessToken = async () => {
    const refreshed = await refreshSallaAccessToken({
      id: merchant.id,
      sallaRefreshToken: currentRefreshToken,
    });
    currentAccessToken = refreshed.accessToken;
    currentRefreshToken = refreshed.refreshToken;
    return refreshed.accessToken;
  };
  const service = new SallaService({
    accessToken: currentAccessToken || merchant.sallaAccessToken || "",
    refreshAccessToken,
    onRateLimit: (info) => {
      if (isDev) {
        console.warn("[salla-sync] rate-limit", info);
      }
    },
  });

  const sallaProduct = await service.fetchProduct(productId);
  if (!sallaProduct) {
    return { created: false, updated: false };
  }

  const name =
    sallaProduct.name || sallaProduct.name_ar || sallaProduct.slug || "";
  const rawSallaProductId = sallaProduct.id;
  const sallaProductId =
    rawSallaProductId !== null && rawSallaProductId !== undefined
      ? String(rawSallaProductId)
      : "";

  if (!name || !sallaProductId) {
    return { created: false, updated: false };
  }

  const existing = await prisma.product.findFirst({
    where: {
      merchantId: merchant.id,
      sallaProductId,
    },
  });

  const categoryInfo = pickSallaCategory(sallaProduct);
  let categoryId: string | null = null;
  if (categoryInfo) {
    const savedCategory = await upsertSallaCategoryFromProduct(
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
    sallaProductId,
    existing ?? undefined
  );

  const images =
    sallaProduct.images?.map((image) => image.url).filter(Boolean) || [];

  const isActive = isSallaProductActive(sallaProduct.status);
  const inStock =
    typeof sallaProduct.quantity === "number"
      ? sallaProduct.quantity > 0
      : true;

  const storeUrl = normalizeStoreUrl(merchant.sallaStoreUrl);
  const externalProductUrl = buildExternalProductUrl({
    platform: "salla",
    product: {
      slug,
      sallaProductId,
    },
    storeUrl,
    providedUrl: resolveSallaProductUrl(sallaProduct),
  });
  const sallaUrl = resolveSallaProductUrl(sallaProduct) || undefined;
  const priceAmount = extractNumericAmount(sallaProduct.price);
  const salePriceAmount = extractNumericAmount(sallaProduct.sale_price);
  const currency =
    extractCurrency(sallaProduct.sale_price) ||
    extractCurrency(sallaProduct.price) ||
    "SAR";
  const hasSalePrice = salePriceAmount !== null;
  const effectivePrice = hasSalePrice ? salePriceAmount : priceAmount ?? 0;
  const originalPrice = hasSalePrice ? priceAmount ?? null : null;
  const tagNames = sallaProduct.sku ? [sallaProduct.sku] : [];
  const productTags = buildProductTagsInput(tagNames);

  const productData = {
    title: sallaProduct.name || sallaProduct.slug || sallaProductId,
    titleAr: sallaProduct.name_ar || null,
    description: sallaProduct.description || null,
    descriptionAr: sallaProduct.description_ar || null,
    price: effectivePrice,
    originalPrice,
    currency,
    images,
    thumbnail: images[0] || null,
    categoryId,
    sallaProductId,
    sallaUrl,
    externalProductUrl: externalProductUrl || undefined,
    merchantId: merchant.id,
    isActive,
    inStock,
    quantity: sallaProduct.quantity || null,
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
      productId: sallaProductId,
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
    productId: sallaProductId,
  });
  return { created: true, updated: false };
}

export async function deactivateSallaProduct(
  merchantId: string,
  sallaProductId: string
): Promise<void> {
  await prisma.product.updateMany({
    where: {
      merchantId,
      sallaProductId,
    },
    data: {
      isActive: false,
      inStock: false,
    },
  });
}
