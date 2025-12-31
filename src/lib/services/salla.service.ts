// src/lib/services/salla.service.ts
// PURPOSE: Salla API integration service for merchant product sync

import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { getSallaConfig } from "@/lib/platform/config";
import { buildExternalProductUrl } from "@/lib/platform/products";
import { normalizeStoreUrl } from "@/lib/platform/store";
import { fetchWithTimeout } from "@/lib/platform/fetch";

interface SallaConfig {
  accessToken: string;
}

interface SallaProduct {
  id: string;
  name?: string;
  name_ar?: string;
  description?: string;
  description_ar?: string;
  price?: number;
  sale_price?: number;
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

export class SallaService {
  private accessToken: string;

  constructor(config: SallaConfig) {
    this.accessToken = config.accessToken;
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

  async fetchProducts(
    page: number = 1,
    perPage: number = 50
  ): Promise<SallaPaginatedResponse<SallaProduct>> {
    const sallaConfig = getSallaConfig();
    if (!sallaConfig.productsApiUrl) {
      throw new Error("Missing SALLA_PRODUCTS_API_URL");
    }

    const url = this.buildPagedUrl(sallaConfig.productsApiUrl, page, perPage);
    const response = await fetchWithTimeout(url, { headers: this.getHeaders() });
    if (!response.ok) {
      throw new Error(`Salla API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      products: data.data || data.products || data.items || [],
      pagination: data.pagination || data.meta?.pagination || {},
    };
  }

  async fetchProduct(productId: string): Promise<SallaProduct | null> {
    const sallaConfig = getSallaConfig();
    if (!sallaConfig.productApiUrlTemplate) {
      throw new Error("Missing SALLA_PRODUCT_API_URL_TEMPLATE");
    }

    const url = sallaConfig.productApiUrlTemplate.replace("{id}", productId);
    const response = await fetchWithTimeout(url, { headers: this.getHeaders() });
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Salla API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data || data.product || data;
  }

  async fetchCategories(): Promise<SallaCategory[]> {
    const sallaConfig = getSallaConfig();
    if (!sallaConfig.categoriesApiUrl) {
      throw new Error("Missing SALLA_CATEGORIES_API_URL");
    }

    const response = await fetchWithTimeout(sallaConfig.categoriesApiUrl, {
      headers: this.getHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Salla API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data || data.categories || [];
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

async function ensureSallaAccessToken(merchant: SallaMerchantAuth) {
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

function resolveSallaProductUrl(product: SallaProduct): string | null {
  return product.url || product.urls?.product || null;
}

async function upsertCategory(
  category: SallaCategory,
  counters: { created: number; updated: number }
): Promise<string | null> {
  const name = category.name || category.name_ar || "";
  const slug = slugify(name);
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
    },
  });
  counters.updated += 1;
  return updated.id;
}

async function resolveProductSlug(
  name: string,
  sallaProductId: string,
  existingSlug?: string | null
): Promise<string> {
  if (existingSlug) return existingSlug;
  const baseSlug = slugify(name) || sallaProductId;
  const conflict = await prisma.product.findUnique({
    where: { slug: baseSlug },
    select: { id: true },
  });
  if (!conflict) return baseSlug;
  return `${baseSlug}-${sallaProductId}`;
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

  const tokens = await ensureSallaAccessToken(merchant);
  const service = new SallaService({
    accessToken: tokens.accessToken || merchant.sallaAccessToken,
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
  const categoryMap = new Map<string, string>();
  for (const category of categories) {
    const categoryId = await upsertCategory(category, categoryCounters);
    if (categoryId) {
      categoryMap.set(category.id, categoryId);
    }
  }

  categoriesCreated = categoryCounters.created;
  categoriesUpdated = categoryCounters.updated;

  let page = 1;
  const perPage = 50;
  let totalPages = 1;

  while (page <= totalPages) {
    const response = await service.fetchProducts(page, perPage);
    const sallaProducts = response.products || [];

    if (response.pagination?.total_pages) {
      totalPages = response.pagination.total_pages;
    }

    for (const sallaProduct of sallaProducts) {
      const name =
        sallaProduct.name || sallaProduct.name_ar || sallaProduct.slug || "";
      if (!name || !sallaProduct.id) {
        continue;
      }

      const existing = await prisma.product.findFirst({
        where: {
          merchantId: merchant.id,
          sallaProductId: sallaProduct.id,
        },
      });

      const slug = await resolveProductSlug(
        name,
        sallaProduct.id,
        existing?.slug
      );

      const categorySource =
        sallaProduct.category ||
        (sallaProduct.categories && sallaProduct.categories[0]) ||
        null;
      const categoryId = categorySource?.id
        ? categoryMap.get(categorySource.id) || null
        : null;

      const images =
        sallaProduct.images?.map((image) => image.url).filter(Boolean) || [];

      const normalizedStatus = sallaProduct.status?.toLowerCase() || "";
      const isActive =
        normalizedStatus === "active" ||
        normalizedStatus === "published" ||
        normalizedStatus === "" ||
        normalizedStatus === "available";
      const inStock =
        typeof sallaProduct.quantity === "number"
          ? sallaProduct.quantity > 0
          : true;

      const storeUrl = normalizeStoreUrl(merchant.sallaStoreUrl);
      const externalProductUrl = buildExternalProductUrl({
        platform: "salla",
        product: {
          slug,
          sallaProductId: sallaProduct.id,
        },
        storeUrl,
        providedUrl: resolveSallaProductUrl(sallaProduct),
      });
      const sallaUrl = resolveSallaProductUrl(sallaProduct) || undefined;
      const effectivePrice =
        typeof sallaProduct.sale_price === "number"
          ? sallaProduct.sale_price
          : sallaProduct.price ?? 0;
      const originalPrice =
        typeof sallaProduct.sale_price === "number"
          ? sallaProduct.price ?? null
          : null;

      const productData = {
        title: sallaProduct.name || sallaProduct.slug || sallaProduct.id,
        titleAr: sallaProduct.name_ar || null,
        description: sallaProduct.description || null,
        descriptionAr: sallaProduct.description_ar || null,
        price: effectivePrice,
        originalPrice,
        currency: "SAR",
        images,
        thumbnail: images[0] || null,
        categoryId,
        tags: sallaProduct.sku ? [sallaProduct.sku] : [],
        sallaProductId: sallaProduct.id,
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
          data: productData,
        });
        productsUpdated += 1;
      } else {
        await prisma.product.create({
          data: productData,
        });
        productsCreated += 1;
      }
    }

    page += 1;
  }

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

  const tokens = await ensureSallaAccessToken(merchant);
  const service = new SallaService({
    accessToken: tokens.accessToken || merchant.sallaAccessToken,
  });

  const sallaProduct = await service.fetchProduct(productId);
  if (!sallaProduct) {
    return { created: false, updated: false };
  }

  const name =
    sallaProduct.name || sallaProduct.name_ar || sallaProduct.slug || "";
  if (!name || !sallaProduct.id) {
    return { created: false, updated: false };
  }

  const existing = await prisma.product.findFirst({
    where: {
      merchantId: merchant.id,
      sallaProductId: sallaProduct.id,
    },
  });

  const slug = await resolveProductSlug(name, sallaProduct.id, existing?.slug);

  const images =
    sallaProduct.images?.map((image) => image.url).filter(Boolean) || [];

  const normalizedStatus = sallaProduct.status?.toLowerCase() || "";
  const isActive =
    normalizedStatus === "active" ||
    normalizedStatus === "published" ||
    normalizedStatus === "" ||
    normalizedStatus === "available";
  const inStock =
    typeof sallaProduct.quantity === "number"
      ? sallaProduct.quantity > 0
      : true;

  const storeUrl = normalizeStoreUrl(merchant.sallaStoreUrl);
  const externalProductUrl = buildExternalProductUrl({
    platform: "salla",
    product: {
      slug,
      sallaProductId: sallaProduct.id,
    },
    storeUrl,
    providedUrl: resolveSallaProductUrl(sallaProduct),
  });
  const sallaUrl = resolveSallaProductUrl(sallaProduct) || undefined;
  const effectivePrice =
    typeof sallaProduct.sale_price === "number"
      ? sallaProduct.sale_price
      : sallaProduct.price ?? 0;
  const originalPrice =
    typeof sallaProduct.sale_price === "number"
      ? sallaProduct.price ?? null
      : null;

  const productData = {
    title: sallaProduct.name || sallaProduct.slug || sallaProduct.id,
    titleAr: sallaProduct.name_ar || null,
    description: sallaProduct.description || null,
    descriptionAr: sallaProduct.description_ar || null,
    price: effectivePrice,
    originalPrice,
    currency: "SAR",
    images,
    thumbnail: images[0] || null,
    tags: sallaProduct.sku ? [sallaProduct.sku] : [],
    sallaProductId: sallaProduct.id,
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
      data: productData,
    });
    return { created: false, updated: true };
  }

  await prisma.product.create({
    data: productData,
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
