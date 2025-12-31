// src/types/product.ts
import { Product, Merchant, Category } from "@prisma/client";

/**
 * Product with relations for API responses
 */
export type ProductWithRelations = Product & {
  merchant: Pick<
    Merchant,
    | "id"
    | "name"
    | "nameAr"
    | "logo"
    | "sallaStoreUrl"
    | "zidStoreUrl"
    | "description"
    | "descriptionAr"
  >;
  category: Pick<Category, "id" | "name" | "nameAr" | "slug"> | null;
};

export type ProductWithCartFields = ProductWithRelations & {
  imageUrl: string | null;
  externalUrl: string;
};

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Products list API response
 */
export interface ProductsResponse {
  products: ProductWithRelations[];
  pagination: PaginationMeta;
}

/**
 * Single product API response
 */
export interface ProductResponse {
  product: ProductWithRelations;
}

/**
 * Trending products API response
 */
export interface TrendingProductsResponse {
  products: ProductWithRelations[];
}

/**
 * Product filters for querying
 */
export interface ProductFilters {
  page?: number;
  limit?: number;
  category?: string;
  merchantId?: string;
  search?: string;
  sortBy?: "trending" | "newest" | "price_low" | "price_high";
  minPrice?: number;
  maxPrice?: number;
}
