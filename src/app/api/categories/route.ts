// src/app/api/categories/route.ts
// LOCATION: src/app/api/categories/route.ts
// PURPOSE: Get all categories with product counts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("api-categories");


export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: {
        isActive: true,
        parentId: null, // Only top-level categories
      },
      orderBy: {
        order: 'asc',
      },
      include: {
        _count: {
          select: {
            products: {
              where: {
                isActive: true,
                inStock: true,
              },
            },
          },
        },
        children: {
          where: {
            isActive: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    // Categories now have platform-independent slugs, no grouping needed
    return NextResponse.json({ categories });
  } catch (error) {
    logger.error("Error fetching categories", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
