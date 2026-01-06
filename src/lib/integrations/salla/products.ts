// src/lib/integrations/salla/products.ts
import { sallaFetch } from "@/lib/integrations/salla/client";

export type SallaMoney = {
  amount?: number | string;
  currency?: string;
};

export type SallaImage = {
  url?: string;
};

export type SallaSku = {
  id?: string | number;
  sku?: string;
  is_default?: boolean;
  stock_quantity?: number | string;
};

export type SallaProduct = {
  id: string | number;
  name?: string;
  description?: string;
  price?: SallaMoney | number | string;
  regular_price?: SallaMoney | number | string;
  sale_price?: SallaMoney | number | string;
  quantity?: number | string;
  stock_quantity?: number | string;
  calories?: number | string;
  sale_end?: string | Record<string, unknown> | null;
  cost_price?: string | number | null;
  is_available?: boolean;
  status?: string;
  sku?: string;
  url?: string;
  urls?: { customer?: string; product?: string };
  thumbnail?: string | null;
  main_image?: string | null;
  images?: Array<SallaImage | string>;
  skus?: SallaSku[];
};

export type SallaPagination = {
  count?: number;
  total?: number;
  perPage?: number;
  currentPage?: number;
  totalPages?: number;
  links?: {
    previous?: string | null;
    next?: string | null;
  };
};

type SallaListResponse = {
  status?: number;
  success?: boolean;
  data?: unknown;
  pagination?: unknown;
};

type SallaSingleResponse = {
  status?: number;
  success?: boolean;
  data?: unknown;
};

const shouldDebug = process.env.RAFF_SALLA_SYNC_DEBUG === "true";
const debugLog = (message: string, details?: Record<string, unknown>) => {
  if (!shouldDebug) return;
  if (details) {
    console.log("[salla-products]", message, details);
    return;
  }
  console.log("[salla-products]", message);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export const toStringOrNull = (value: unknown): string | null => {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
};

export const moneyAmount = (value: unknown): number | null => {
  if (!isRecord(value)) return null;
  if (!("amount" in value)) return null;
  return toNumberOrNull(value.amount);
};

const parsePagination = (input: unknown): SallaPagination => {
  if (!isRecord(input)) return {};
  const links = isRecord(input.links) ? input.links : undefined;

  return {
    count: toNumberOrNull(input.count) ?? undefined,
    total: toNumberOrNull(input.total) ?? undefined,
    perPage: toNumberOrNull(input.perPage) ?? toNumberOrNull(input.per_page) ?? undefined,
    currentPage:
      toNumberOrNull(input.currentPage) ??
      toNumberOrNull(input.current_page) ??
      undefined,
    totalPages:
      toNumberOrNull(input.totalPages) ??
      toNumberOrNull(input.total_pages) ??
      undefined,
    links: links
      ? {
          previous: toStringOrNull(links.previous),
          next: toStringOrNull(links.next),
        }
      : undefined,
  };
};

export async function sallaListProducts(
  token: string,
  params?: {
    page?: number;
    perPage?: number;
    keyword?: string;
    status?: string;
    category?: string | number;
    format?: string;
  }
): Promise<{ items: SallaProduct[]; pagination: SallaPagination }> {
  const response = await sallaFetch<SallaListResponse>({
    token,
    path: "/admin/v2/products",
    query: {
      page: params?.page,
      per_page: params?.perPage,
      keyword: params?.keyword,
      status: params?.status,
      category: params?.category,
      format: params?.format,
    },
  });

  if (!Array.isArray(response.data)) {
    throw new Error("Salla list products data is not an array");
  }

  const items = response.data as SallaProduct[];
  const pagination = parsePagination(response.pagination);
  debugLog("list-products-shape", {
    isArray: Array.isArray(items),
    count: items.length,
    currentPage: pagination.currentPage ?? null,
    totalPages: pagination.totalPages ?? null,
  });

  return { items, pagination };
}

export async function sallaGetProductById(
  token: string,
  productId: string
): Promise<SallaProduct> {
  const response = await sallaFetch<SallaSingleResponse>({
    token,
    path: `/admin/v2/products/${encodeURIComponent(productId)}`,
  });

  if (!isRecord(response.data)) {
    throw new Error("Salla product data is not an object");
  }

  const product = response.data as SallaProduct;
  debugLog("get-product-by-id-shape", {
    isObject: typeof product === "object" && product !== null,
  });

  return product;
}

export async function sallaGetProductBySku(
  token: string,
  sku: string
): Promise<SallaProduct> {
  if (!sku) {
    throw new Error("SKU is required for Salla product lookup");
  }

  const response = await sallaFetch<SallaSingleResponse>({
    token,
    path: `/admin/v2/products/sku/${encodeURIComponent(sku)}`,
  });

  if (!isRecord(response.data)) {
    throw new Error("Salla product data is not an object");
  }

  const product = response.data as SallaProduct;
  debugLog("get-product-by-sku-shape", {
    isObject: typeof product === "object" && product !== null,
  });

  return product;
}
