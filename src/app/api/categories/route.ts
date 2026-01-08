// src/app/api/categories/route.ts
// LOCATION: src/app/api/categories/route.ts
// PURPOSE: Get all categories with product counts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    // Group categories by name to handle merchant-specific duplicates
    // For categories with the same name from different merchants, merge them
    const categoryMap = new Map<string, typeof categories[0] & { _count: { products: number } }>();

    for (const category of categories) {
      const key = category.name; // Group by name
      const existing = categoryMap.get(key);

      if (existing) {
        // Merge: sum up product counts, keep first category's metadata
        existing._count.products += category._count.products;
      } else {
        categoryMap.set(key, category);
      }
    }

    // Convert map back to array
    const groupedCategories = Array.from(categoryMap.values());

    return NextResponse.json({ categories: groupedCategories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
