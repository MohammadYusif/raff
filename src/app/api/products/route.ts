// src/app/api/products/route.ts
// LOCATION: src/app/api/products/route.ts
// PURPOSE: List all products with filtering, search, and pagination

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Extract query parameters
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");
    const category = searchParams.get("category");
    const merchantId = searchParams.get("merchantId");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy"); // Don't set default here
    const minPrice = searchParams.get("minPrice")
      ? parseFloat(searchParams.get("minPrice")!)
      : undefined;
    const maxPrice = searchParams.get("maxPrice")
      ? parseFloat(searchParams.get("maxPrice")!)
      : undefined;

    // Build where clause
    const where: any = {
      isActive: true,
      inStock: true,
    };

    if (category) {
      where.category = {
        slug: category,
      };
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

    // ✨ NEW: Filter for trending products when sortBy is trending
    if (sortBy === "trending") {
      where.trendingScore = {
        gt: 70, // Only products with trendingScore > 70
      };
    }

    // Build orderBy clause
    let orderBy: any = {};
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
        // Default sort by trending score when no sortBy specified
        orderBy = { trendingScore: "desc" };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query
    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          merchant: {
            select: {
              id: true,
              name: true,
              nameAr: true,
              logo: true,
              sallaStoreUrl: true,
              zidStoreUrl: true,
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
        },
      }),
      prisma.product.count({ where }),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
