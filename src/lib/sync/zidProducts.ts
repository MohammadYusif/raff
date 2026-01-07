// src/lib/sync/zidProducts.ts
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { getZidConfig } from "@/lib/platform/config";
import { buildExternalProductUrl } from "@/lib/platform/products";
import { normalizeStoreUrl } from "@/lib/platform/store";
import {
  zidListCategories,
  zidListProducts,
  zidRetrieveCategory,
  zidRetrieveProduct,
  type ZidMerchantHeaders,
} from "@/lib/services/zidApi";
import { ensureZidAccessToken, type ZidMerchantAuth } from "@/lib/services/zid.service";

type ZidOrdering = "created_at" | "updated_at";

const isDev = process.env.NODE_ENV !== "production";
const devLog = (message: string, details?: Record<string, unknown>) => {
  if (!isDev) return;
  if (details) {
    console.debug("[zid-sync]", message, details);
    return;
  }
  console.debug("[zid-sync]", message);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toStringOrNull = (value: unknown): string | null => {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
};

const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toIntOrNull = (value: unknown): number | null => {
  const parsed = toNumberOrNull(value);
  return parsed === null ? null : Math.trunc(parsed);
};

const toBooleanOrNull = (value: unknown): boolean | null => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return null;
};

const extractMoneyAmount = (value: unknown): number | null => {
  if (!isRecord(value)) return null;
  if ("amount" in value) {
    return toNumberOrNull(value.amount);
  }
  if ("value" in value) {
    return toNumberOrNull(value.value);
  }
  return null;
};

const extractZidName = (value: unknown) => {
  if (typeof value === "string") {
    return { title: value || "Product", titleAr: null };
  }
  if (isRecord(value)) {
    const en = toStringOrNull(value.en);
    const ar = toStringOrNull(value.ar);
    const title = en ?? ar ?? "Product";
    return { title, titleAr: ar ?? null };
  }
  return { title: "Product", titleAr: null };
};

const extractZidDescription = (product: Record<string, unknown>) => {
  const shortDescription =
    toStringOrNull(product.short_description) ??
    toStringOrNull(product.shortDescription);
  const descriptionValue = product.description;
  let description: string | null = null;
  let descriptionAr: string | null = null;

  if (shortDescription) {
    description = shortDescription;
  } else if (isRecord(descriptionValue)) {
    description = toStringOrNull(descriptionValue.en);
    descriptionAr = toStringOrNull(descriptionValue.ar);
  } else {
    description = toStringOrNull(descriptionValue);
  }

  if (!descriptionAr && isRecord(descriptionValue)) {
    descriptionAr = toStringOrNull(descriptionValue.ar);
  }

  return { description, descriptionAr };
};

const extractZidImageUrl = (image: unknown): string | null => {
  if (typeof image === "string") return image;
  if (!isRecord(image)) return null;

  const direct =
    toStringOrNull(image.url) ??
    toStringOrNull(image.image) ??
    toStringOrNull(image.src) ??
    toStringOrNull(image.full) ??
    toStringOrNull(image.original) ??
    toStringOrNull(image.thumbnail) ??
    toStringOrNull(image.medium) ??
    toStringOrNull(image.large);

  if (direct) return direct;

  if (isRecord(image.urls)) {
    return (
      toStringOrNull(image.urls.original) ??
      toStringOrNull(image.urls.full) ??
      toStringOrNull(image.urls.thumbnail)
    );
  }

  return null;
};

const extractZidImageUrls = (images: unknown): string[] => {
  const list = Array.isArray(images) ? images : [];
  return list
    .map((image) => extractZidImageUrl(image))
    .filter((url): url is string => Boolean(url));
};

const resolveZidProductUrl = (product: Record<string, unknown>): string | null => {
  return (
    toStringOrNull(product.url) ??
    (isRecord(product.urls) ? toStringOrNull(product.urls.product) : null) ??
    (isRecord(product.links) ? toStringOrNull(product.links.product) : null)
  );
};

const normalizeZidStock = (product: Record<string, unknown>) => {
  const productInfinite = toBooleanOrNull(product.is_infinite) === true;
  const stocksRaw = Array.isArray(product.stocks) ? product.stocks : [];
  const stocks = stocksRaw.filter(isRecord);
  const anyInfinite = stocks.some(
    (stock) => toBooleanOrNull(stock.is_infinite) === true
  );

  if (productInfinite || anyInfinite) {
    return { quantity: null, inStock: true };
  }

  const productQty = toIntOrNull(product.quantity);
  let stockQtySum = 0;
  let hasStockQty = false;

  for (const stock of stocks) {
    const qty = toIntOrNull(stock.available_quantity);
    if (qty === null) continue;
    hasStockQty = true;
    stockQtySum += qty;
  }

  const quantity = productQty ?? (hasStockQty ? stockQtySum : 0);
  return { quantity, inStock: quantity > 0 };
};

const isZidProductActive = (product: Record<string, unknown>) => {
  if (typeof product.is_published === "boolean") {
    return product.is_published;
  }
  const status = toStringOrNull(product.status)?.trim().toLowerCase() ?? "";
  if (!status) return true;
  return (
    status === "active" ||
    status === "published" ||
    status === "available"
  );
};

type ZidCategoryRef = {
  externalId: string;
  name: string;
  slugSource: string;
  nameAr: string | null;
  isActive: boolean;
  description: string | null;
  descriptionAr: string | null;
  image: string | null;
};

const normalizeZidCategory = (category: Record<string, unknown>): ZidCategoryRef | null => {
  const externalId = toStringOrNull(category.id);
  if (!externalId) return null;

  const name =
    toStringOrNull(category.name) ??
    (isRecord(category.names) ? toStringOrNull(category.names.en) : null) ??
    (isRecord(category.names) ? toStringOrNull(category.names.ar) : null) ??
    "Category";

  const nameAr = isRecord(category.names)
    ? toStringOrNull(category.names.ar)
    : null;
  const slugSource = toStringOrNull(category.slug) ?? name;
  const isActive = category.is_published === true;

  const descriptionValue = category.description;
  const description = isRecord(descriptionValue)
    ? toStringOrNull(descriptionValue.en)
    : toStringOrNull(descriptionValue);
  const descriptionAr = isRecord(descriptionValue)
    ? toStringOrNull(descriptionValue.ar)
    : null;

  const image = toStringOrNull(category.image);

  return {
    externalId,
    name,
    slugSource,
    nameAr,
    isActive,
    description,
    descriptionAr,
    image,
  };
};

const extractCategoryItems = (raw: unknown): Record<string, unknown>[] => {
  if (!isRecord(raw)) return [];
  const candidates = [
    raw.results,
    raw.categories,
    raw.data,
    raw.items,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter(isRecord);
    }
  }
  return [];
};

const extractCategoryDetail = (raw: unknown): Record<string, unknown> | null => {
  if (!isRecord(raw)) return null;
  if (isRecord(raw.category)) return raw.category;
  if (isRecord(raw.data)) return raw.data;
  return raw;
};

const extractProductItems = (raw: unknown): Record<string, unknown>[] => {
  if (!isRecord(raw)) return [];
  const candidates = [raw.results, raw.products, raw.data, raw.items];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter(isRecord);
    }
  }
  return [];
};

const extractProductDetail = (raw: unknown): Record<string, unknown> | null => {
  if (!isRecord(raw)) return null;
  if (isRecord(raw.product)) return raw.product;
  if (isRecord(raw.data)) return raw.data;
  return raw;
};

const extractPagination = (raw: unknown) => {
  if (!isRecord(raw)) {
    return { count: null, next: null, previous: null };
  }
  const count =
    toNumberOrNull(raw.count) ??
    (isRecord(raw.pagination) ? toNumberOrNull(raw.pagination.count) : null) ??
    null;
  const next =
    toStringOrNull(raw.next) ??
    (isRecord(raw.pagination) ? toStringOrNull(raw.pagination.next) : null) ??
    (isRecord(raw.links) ? toStringOrNull(raw.links.next) : null) ??
    null;
  const previous =
    toStringOrNull(raw.previous) ??
    (isRecord(raw.pagination) ? toStringOrNull(raw.pagination.previous) : null) ??
    (isRecord(raw.links) ? toStringOrNull(raw.links.previous) : null) ??
    null;
  return { count, next, previous };
};

const buildCategorySlug = (
  merchantId: string,
  externalId: string,
  slugSource: string
) => {
  const safeSlug = slugify(slugSource) || "category";
  return `zid-${merchantId}-${externalId}-${safeSlug}`;
};

const findCategoryByExternalId = async (
  merchantId: string,
  externalId: string
) => {
  return prisma.category.findFirst({
    where: {
      slug: { startsWith: `zid-${merchantId}-${externalId}-` },
    },
    select: { id: true, slug: true },
  });
};

const upsertZidCategory = async (
  merchantId: string,
  normalized: ZidCategoryRef
): Promise<{ id: string; created: boolean }> => {
  const existing = await findCategoryByExternalId(
    merchantId,
    normalized.externalId
  );
  if (!existing) {
    const created = await prisma.category.create({
      data: {
        name: normalized.name,
        nameAr: normalized.nameAr,
        slug: buildCategorySlug(
          merchantId,
          normalized.externalId,
          normalized.slugSource
        ),
        description: normalized.description,
        descriptionAr: normalized.descriptionAr,
        icon: null,
        image: normalized.image,
        isActive: normalized.isActive,
        parentId: null,
      },
      select: { id: true },
    });
    return { id: created.id, created: true };
  }

  await prisma.category.update({
    where: { id: existing.id },
    data: {
      name: normalized.name,
      nameAr: normalized.nameAr,
      description: normalized.description ?? undefined,
      descriptionAr: normalized.descriptionAr ?? undefined,
      image: normalized.image ?? undefined,
      isActive: normalized.isActive,
    },
  });
  return { id: existing.id, created: false };
};

const applyCategoryDetail = async (
  categoryId: string,
  detail: ZidCategoryRef
) => {
  const updates: {
    description?: string | null;
    descriptionAr?: string | null;
    nameAr?: string | null;
    image?: string | null;
  } = {};
  if (detail.description !== null) updates.description = detail.description;
  if (detail.descriptionAr !== null)
    updates.descriptionAr = detail.descriptionAr;
  if (detail.nameAr !== null) updates.nameAr = detail.nameAr;
  if (detail.image !== null) updates.image = detail.image;

  if (Object.keys(updates).length === 0) return;
  await prisma.category.update({
    where: { id: categoryId },
    data: updates,
  });
};

type ZidCategoryPick = {
  externalId: string;
  name: string;
  slugSource: string;
};

const pickZidCategory = (product: Record<string, unknown>): ZidCategoryPick | null => {
  const categories = Array.isArray(product.categories) ? product.categories : [];
  const primary =
    (categories[0] as Record<string, unknown> | undefined) ??
    (isRecord(product.category) ? product.category : null);
  if (!primary || !isRecord(primary)) return null;

  const externalId = toStringOrNull(primary.id);
  if (!externalId) return null;
  const name = toStringOrNull(primary.name) ?? "Category";
  const slugSource = toStringOrNull(primary.slug) ?? name;
  return { externalId, name, slugSource };
};

const resolveCategoryId = async (
  merchantId: string,
  category: ZidCategoryPick,
  cache: Map<string, string>
): Promise<string | null> => {
  const cached = cache.get(category.externalId);
  if (cached) return cached;

  const existing = await findCategoryByExternalId(
    merchantId,
    category.externalId
  );
  if (existing) {
    cache.set(category.externalId, existing.id);
    return existing.id;
  }

  const normalized: ZidCategoryRef = {
    externalId: category.externalId,
    name: category.name,
    slugSource: category.slugSource,
    nameAr: null,
    isActive: true,
    description: null,
    descriptionAr: null,
    image: null,
  };
  const created = await upsertZidCategory(merchantId, normalized);
  cache.set(category.externalId, created.id);
  return created.id;
};

const buildProductSlug = (
  merchantId: string,
  zidProductId: string,
  title: string
) => {
  const safeTitle = slugify(title) || "product";
  return `zid-${merchantId}-${zidProductId}-${safeTitle}`;
};

type ZidProductSyncResult = {
  created: boolean;
  updated: boolean;
};

const upsertZidProduct = async (
  merchant: {
    id: string;
    zidStoreUrl: string | null;
  },
  product: Record<string, unknown>,
  categoryCache: Map<string, string>
): Promise<ZidProductSyncResult> => {
  const zidProductId = toStringOrNull(product.id);
  if (!zidProductId) {
    devLog("skip-product", { reason: "missing-id" });
    return { created: false, updated: false };
  }

  const { title, titleAr } = extractZidName(product.name);
  const { description, descriptionAr } = extractZidDescription(product);
  const salePrice =
    toNumberOrNull(product.sale_price) ??
    extractMoneyAmount(product.sale_price);
  const basePrice =
    toNumberOrNull(product.price) ??
    extractMoneyAmount(product.price);
  const price = salePrice ?? basePrice ?? 0;
  const currency =
    toStringOrNull(product.currency) ??
    (isRecord(product.sale_price)
      ? toStringOrNull(product.sale_price.currency)
      : null) ??
    (isRecord(product.price) ? toStringOrNull(product.price.currency) : null) ??
    "SAR";

  const images = extractZidImageUrls(product.images);
  const thumbnail = images[0] ?? null;

  const { quantity, inStock } = normalizeZidStock(product);
  const isActive = isZidProductActive(product);

  const categoryInfo = pickZidCategory(product);
  const categoryId = categoryInfo
    ? await resolveCategoryId(merchant.id, categoryInfo, categoryCache)
    : null;

  const existing = await prisma.product.findUnique({
    where: {
      zidProductId_merchantId: { zidProductId, merchantId: merchant.id },
    },
    select: {
      id: true,
      slug: true,
      sallaProductId: true,
      sallaUrl: true,
    },
  });

  const slug = existing?.slug ?? buildProductSlug(merchant.id, zidProductId, title);
  const storeUrl = normalizeStoreUrl(merchant.zidStoreUrl);
  const externalProductUrl = buildExternalProductUrl({
    platform: "zid",
    product: {
      slug,
      zidProductId,
    },
    storeUrl,
    providedUrl: resolveZidProductUrl(product),
  });

  const data = {
    title,
    titleAr,
    description: description ?? null,
    descriptionAr: descriptionAr ?? null,
    price,
    currency,
    originalPrice: toNumberOrNull(product.compare_price),
    images,
    thumbnail,
    categoryId,
    zidProductId,
    sallaProductId: existing?.sallaProductId ?? undefined,
    sallaUrl: existing?.sallaUrl ?? undefined,
    externalProductUrl: externalProductUrl ?? undefined,
    merchantId: merchant.id,
    isActive,
    inStock,
    quantity,
    slug,
  };

  if (existing?.id) {
    await prisma.product.update({
      where: { id: existing.id },
      data,
    });
    return { created: false, updated: true };
  }

  await prisma.product.create({ data });
  return { created: true, updated: false };
};

const getNextPage = (nextUrl: string | null): number | null => {
  if (!nextUrl) return null;
  try {
    const baseUrl = getZidConfig().apiBaseUrl;
    const parsed = new URL(nextUrl, baseUrl);
    const pageValue = parsed.searchParams.get("page");
    const parsedPage = pageValue ? Number(pageValue) : NaN;
    return Number.isFinite(parsedPage) ? parsedPage : null;
  } catch {
    return null;
  }
};

const buildMerchantHeaders = (merchant: ZidMerchantAuth): ZidMerchantHeaders => {
  if (!merchant.zidAccessToken) {
    throw new Error("Zid access token missing");
  }
  if (!merchant.zidStoreId) {
    throw new Error("Zid store id missing");
  }
  if (!merchant.zidManagerToken) {
    throw new Error("Zid manager token missing");
  }

  return {
    id: merchant.id,
    zidAccessToken: merchant.zidAccessToken,
    zidManagerToken: merchant.zidManagerToken,
    zidStoreId: merchant.zidStoreId,
  };
};

const loadMerchant = async (merchantId: string): Promise<ZidMerchantAuth> => {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: {
      id: true,
      zidAccessToken: true,
      zidRefreshToken: true,
      zidTokenExpiry: true,
      zidManagerToken: true,
      zidStoreId: true,
      zidStoreUrl: true,
    },
  });

  if (!merchant) {
    throw new Error("Merchant not found");
  }

  return merchant;
};

export async function syncZidCategories(
  merchantId: string
): Promise<{ createdCount: number; updatedCount: number }> {
  const merchant = await loadMerchant(merchantId);
  const tokens = await ensureZidAccessToken(merchant);
  const accessToken = tokens.accessToken || merchant.zidAccessToken;
  if (!accessToken) {
    throw new Error("Zid access token missing");
  }

  const headers = buildMerchantHeaders({
    ...merchant,
    zidAccessToken: accessToken,
  });

  const raw = await zidListCategories(headers);
  const items = extractCategoryItems(raw);
  let createdCount = 0;
  let updatedCount = 0;

  for (const item of items) {
    const normalized = normalizeZidCategory(item);
    if (!normalized) continue;
    const result = await upsertZidCategory(merchant.id, normalized);
    if (result.created) {
      createdCount += 1;
    } else {
      updatedCount += 1;
    }

    try {
      const detailRaw = await zidRetrieveCategory(
        headers,
        normalized.externalId
      );
      const detailRecord = extractCategoryDetail(detailRaw);
      if (!detailRecord) continue;
      const detailNormalized = normalizeZidCategory(detailRecord);
      if (!detailNormalized) continue;
      await applyCategoryDetail(result.id, detailNormalized);
    } catch (error) {
      devLog("category-enrich-failed", {
        categoryId: normalized.externalId,
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  devLog("categories-synced", { merchantId, createdCount, updatedCount });
  return { createdCount, updatedCount };
}

export async function syncZidProducts(
  merchantId: string,
  opts?: { ordering?: ZidOrdering }
): Promise<{
  createdCount: number;
  updatedCount: number;
  syncedCount: number;
  pagesFetched: number;
}> {
  const merchant = await loadMerchant(merchantId);
  const tokens = await ensureZidAccessToken(merchant);
  const accessToken = tokens.accessToken || merchant.zidAccessToken;
  if (!accessToken) {
    throw new Error("Zid access token missing");
  }

  const headers = buildMerchantHeaders({
    ...merchant,
    zidAccessToken: accessToken,
  });

  const categoryCache = new Map<string, string>();
  let createdCount = 0;
  let updatedCount = 0;
  let syncedCount = 0;
  let pagesFetched = 0;

  const ordering = opts?.ordering ?? "updated_at";
  let page = 1;
  let next: string | null = null;
  const seenNext = new Set<string>();

  while (true) {
    const raw = await zidListProducts(headers, {
      page,
      pageSize: 50,
      ordering,
      extended: true,
    });
    pagesFetched += 1;
    const items = extractProductItems(raw);
    const pagination = extractPagination(raw);
    next = pagination.next;

    for (const item of items) {
      const result = await upsertZidProduct(
        { id: merchant.id, zidStoreUrl: merchant.zidStoreUrl },
        item,
        categoryCache
      );
      if (result.created) createdCount += 1;
      if (result.updated) updatedCount += 1;
      if (result.created || result.updated) syncedCount += 1;
    }

    if (!next) break;
    if (seenNext.has(next)) {
      devLog("pagination-loop-detected", { next });
      break;
    }
    seenNext.add(next);
    const nextPage = getNextPage(next);
    if (nextPage) {
      page = nextPage;
    } else {
      devLog("pagination-fallback", { next });
      page += 1;
    }
  }

  devLog("products-synced", {
    merchantId,
    createdCount,
    updatedCount,
    syncedCount,
    pagesFetched,
  });

  return { createdCount, updatedCount, syncedCount, pagesFetched };
}

export async function syncZidProductById(
  merchant: ZidMerchantAuth,
  productId: string
): Promise<{ created: boolean; updated: boolean }> {
  const tokens = await ensureZidAccessToken(merchant);
  const accessToken = tokens.accessToken || merchant.zidAccessToken;
  if (!accessToken) {
    throw new Error("Zid access token missing");
  }

  const headers = buildMerchantHeaders({
    ...merchant,
    zidAccessToken: accessToken,
  });

  const raw = await zidRetrieveProduct(headers, productId, { role: "Manager" });
  const product = extractProductDetail(raw);
  if (!product) {
    return { created: false, updated: false };
  }

  const categoryCache = new Map<string, string>();
  const result = await upsertZidProduct(
    { id: merchant.id, zidStoreUrl: merchant.zidStoreUrl },
    product,
    categoryCache
  );

  return result;
}
