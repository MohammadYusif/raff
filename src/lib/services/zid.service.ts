// src/lib/services/zid.service.ts
// PURPOSE: Zid API integration service for merchant product sync

import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { getZidConfig } from "@/lib/platform/config";
import { buildExternalProductUrl } from "@/lib/platform/products";
import { normalizeStoreUrl } from "@/lib/platform/store";
import { fetchWithTimeout } from "@/lib/platform/fetch";

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
      const response = await fetchWithTimeout(
        `${this.baseUrl}/managers/store/products?page=${page}&per_page=${perPage}`,
        {
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(`Zid API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        products: data.products || [],
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
      const response = await fetchWithTimeout(
        `${this.baseUrl}/managers/store/categories`,
        {
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(`Zid API error: ${response.status}`);
      }

      const data = await response.json();
      return data.categories || [];
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

async function upsertCategory(
  category: ZidCategory,
  counters: { created: number; updated: number }
): Promise<string | null> {
  const slug = slugify(category.name || "");
  if (!slug) return null;

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
    },
  });
  counters.updated += 1;
  return updated.id;
}

async function resolveProductSlug(
  name: string,
  zidProductId: string,
  existingSlug?: string | null
): Promise<string> {
  if (existingSlug) return existingSlug;
  const baseSlug = slugify(name) || zidProductId;
  const conflict = await prisma.product.findUnique({
    where: { slug: baseSlug },
    select: { id: true },
  });
  if (!conflict) return baseSlug;
  return `${baseSlug}-${zidProductId}`;
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
    const zidProducts = response.products || [];

    if (response.pagination?.total_pages) {
      totalPages = response.pagination.total_pages;
    }

    for (const zidProduct of zidProducts) {
      const existing = await prisma.product.findFirst({
        where: {
          merchantId: merchant.id,
          zidProductId: zidProduct.id,
        },
      });

      const slug = await resolveProductSlug(
        zidProduct.name,
        zidProduct.id,
        existing?.slug
      );

      const categoryId =
        zidProduct.categories && zidProduct.categories.length > 0
          ? categoryMap.get(zidProduct.categories[0].id) || null
          : null;

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
          zidProductId: zidProduct.id,
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
        zidProductId: zidProduct.id,
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

  const existing = await prisma.product.findFirst({
    where: {
      merchantId: merchant.id,
      zidProductId: zidProduct.id,
    },
  });

  const slug = await resolveProductSlug(
    zidProduct.name,
    zidProduct.id,
    existing?.slug
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
      zidProductId: zidProduct.id,
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
    zidProductId: zidProduct.id,
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
    return { created: false, updated: true };
  }

  await prisma.product.create({
    data: {
      ...productData,
      ...(productTags ? { productTags } : {}),
    },
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
