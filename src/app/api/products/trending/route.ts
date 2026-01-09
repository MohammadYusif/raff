// src/app/api/products/trending/route.ts
// LOCATION: src/app/api/products/trending/route.ts
// PURPOSE: Get trending products sorted by trending score

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('trending-products');

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '8');

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        inStock: true,
        trendingScore: {
          gt: 0, // Only products with trending activity
        },
      },
      orderBy: {
        trendingScore: 'desc',
      },
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
    });

    return NextResponse.json({ products });
  } catch (error) {
    logger.error('Error fetching trending products', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Failed to fetch trending products' },
      { status: 500 }
    );
  }
}
