// src/app/api/search/route.ts
// PURPOSE: Instant search API with suggestions and full results

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");
    const limit = parseInt(searchParams.get("limit") || "10");
    const mode = searchParams.get("mode") || "full"; // 'suggestions' or 'full'

    if (!query || query.trim().length === 0) {
      return NextResponse.json({
        results: [],
        suggestions: [],
        count: 0,
      });
    }

    const searchTerm = query.trim();

    // Build search conditions
    const searchConditions = {
      isActive: true,
      inStock: true,
      OR: [
        { title: { contains: searchTerm, mode: "insensitive" as const } },
        { titleAr: { contains: searchTerm, mode: "insensitive" as const } },
        { description: { contains: searchTerm, mode: "insensitive" as const } },
        {
          descriptionAr: {
            contains: searchTerm,
            mode: "insensitive" as const,
          },
        },
        { tags: { has: searchTerm.toLowerCase() } },
      ],
    };

    if (mode === "suggestions") {
      // For autocomplete - return minimal data, fast response
      const suggestions = await prisma.product.findMany({
        where: searchConditions,
        take: limit,
        select: {
          id: true,
          slug: true,
          title: true,
          titleAr: true,
          price: true,
          thumbnail: true,
          category: {
            select: {
              name: true,
              nameAr: true,
              slug: true,
            },
          },
        },
        orderBy: {
          trendingScore: "desc",
        },
      });

      return NextResponse.json({
        suggestions,
        count: suggestions.length,
      });
    } else {
      // Full search results with pagination
      const page = parseInt(searchParams.get("page") || "1");
      const skip = (page - 1) * limit;

      const [products, totalCount] = await Promise.all([
        prisma.product.findMany({
          where: searchConditions,
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
          orderBy: [
            { trendingScore: "desc" },
            { viewCount: "desc" },
            { createdAt: "desc" },
          ],
        }),
        prisma.product.count({ where: searchConditions }),
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      return NextResponse.json({
        results: products,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      });
    }
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Failed to perform search" },
      { status: 500 }
    );
  }
}
