// src/app/api/admin/repair-product-categories/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Repair products with null categoryId by matching category names from product slugs
 * This fixes the issue where products lost category associations after merchant merge
 */

export async function POST(request: NextRequest) {
  try {
    const { dryRun = true } = await request.json().catch(() => ({ dryRun: true }));

    // Find all products with null categoryId
    const productsWithoutCategory = await prisma.product.findMany({
      where: {
        categoryId: null,
        isActive: true,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        merchantId: true,
      },
    });

    if (productsWithoutCategory.length === 0) {
      return NextResponse.json({
        status: "success",
        message: "No products need repair",
        fixed: 0,
      });
    }

    const repairs = [];
    let fixedCount = 0;

    for (const product of productsWithoutCategory) {
      // Extract category name from product slug
      // Format: "salla-merchantId-productId-categoryName" or similar
      const slugParts = product.slug.split('-');

      // Try to find category name from slug (usually the last part)
      const possibleCategoryName = slugParts[slugParts.length - 1];

      // If that doesn't work, try to find any category for this merchant
      let matchingCategory = await prisma.category.findFirst({
        where: {
          OR: [
            { name: possibleCategoryName },
            { nameAr: possibleCategoryName },
            { slug: { contains: possibleCategoryName } }
          ],
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      });

      // If still no match, try broader search based on merchant
      if (!matchingCategory) {
        matchingCategory = await prisma.category.findFirst({
          where: {
            slug: { contains: `salla-${product.merchantId}-` },
            isActive: true,
          },
          select: {
            id: true,
            name: true,
            slug: true,
          },
        });
      }

      if (matchingCategory) {
        repairs.push({
          productId: product.id,
          productTitle: product.title,
          productSlug: product.slug,
          categoryId: matchingCategory.id,
          categoryName: matchingCategory.name,
          categorySlug: matchingCategory.slug,
        });

        if (!dryRun) {
          await prisma.product.update({
            where: { id: product.id },
            data: { categoryId: matchingCategory.id },
          });
          fixedCount++;
        }
      } else {
        repairs.push({
          productId: product.id,
          productTitle: product.title,
          productSlug: product.slug,
          categoryId: null,
          categoryName: "NO_MATCH_FOUND",
          categorySlug: null,
        });
      }
    }

    return NextResponse.json({
      status: dryRun ? "dry-run" : "success",
      message: dryRun
        ? `Found ${productsWithoutCategory.length} products to repair. Send {\"dryRun\": false} to apply.`
        : `Repaired ${fixedCount} products`,
      totalProductsWithoutCategory: productsWithoutCategory.length,
      fixedCount: dryRun ? 0 : fixedCount,
      repairs,
    });

  } catch (error) {
    console.error("Error repairing product categories:", error);
    return NextResponse.json(
      {
        error: "Failed to repair product categories",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "POST /api/admin/repair-product-categories",
    description: "Fix products with null categoryId by matching category names",
    usage: {
      dryRun: "POST with {\"dryRun\": true} to preview changes",
      apply: "POST with {\"dryRun\": false} to apply changes",
    },
  });
}
