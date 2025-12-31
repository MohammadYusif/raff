// src/lib/server/products.ts
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { PaginationMeta, ProductFilters } from "@/types";

const PRODUCT_RELATIONS_INCLUDE = {
  merchant: {
    select: {
      id: true,
      name: true,
      nameAr: true,
      logo: true,
      sallaStoreUrl: true,
      zidStoreUrl: true,
      description: true,
      descriptionAr: true,
    },
  },
  category: {
    select: {
      id: true,
      name: true,
      nameAr: true,
      slug: true,
    },
  },
} satisfies Prisma.ProductInclude;

export async function fetchProductsServer(filters: ProductFilters = {}) {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 12;
  const category = filters.category ?? null;
  const merchantId = filters.merchantId ?? null;
  const search = filters.search ?? null;
  const sortBy = filters.sortBy ?? null;
  const minPrice = filters.minPrice ?? undefined;
  const maxPrice = filters.maxPrice ?? undefined;

  const where: Prisma.ProductWhereInput = {
    isActive: true,
    inStock: true,
  };

  if (category) {
    where.category = { slug: category };
  }

  if (merchantId) {
    where.merchantId = merchantId;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { titleAr: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { descriptionAr: { contains: search, mode: "insensitive" } },
      { tags: { has: search.toLowerCase() } },
    ];
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {};
    if (minPrice !== undefined) where.price.gte = minPrice;
    if (maxPrice !== undefined) where.price.lte = maxPrice;
  }

  if (sortBy === "trending") {
    where.trendingScore = { gt: 70 };
  }

  let orderBy: Prisma.ProductOrderByWithRelationInput = {};
  switch (sortBy) {
    case "trending":
      orderBy = { trendingScore: "desc" };
      break;
    case "newest":
      orderBy = { createdAt: "desc" };
      break;
    case "price_low":
      orderBy = { price: "asc" };
      break;
    case "price_high":
      orderBy = { price: "desc" };
      break;
    default:
      orderBy = { trendingScore: "desc" };
  }

  const skip = (page - 1) * limit;

  const [products, totalCount] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: PRODUCT_RELATIONS_INCLUDE,
    }),
    prisma.product.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  const pagination: PaginationMeta = {
    page,
    limit,
    totalCount,
    totalPages,
    hasNextPage,
    hasPreviousPage,
  };

  return { products, pagination };
}
