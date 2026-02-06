// src/app/api/admin/delete-orphaned-products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/auth/admin-guard";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("api-admin-delete-orphaned-products");


/**
 * Delete orphaned products from old deleted merchants
 * These are products with old merchant IDs in their slugs that have null categoryId
 */

export async function POST(request: NextRequest) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  try {
    const { dryRun = true, oldMerchantId } = await request.json().catch(() => ({ dryRun: true }));

    if (!oldMerchantId) {
      return NextResponse.json(
        { error: "oldMerchantId is required" },
        { status: 400 }
      );
    }

    // Find all products with the old merchant ID in their slug
    const orphanedProducts = await prisma.product.findMany({
      where: {
        slug: {
          contains: `salla-${oldMerchantId}-`
        }
      },
      select: {
        id: true,
        title: true,
        slug: true,
        categoryId: true,
        merchantId: true,
      },
    });

    if (orphanedProducts.length === 0) {
      return NextResponse.json({
        status: "success",
        message: "No orphaned products found",
        deleted: 0,
      });
    }

    const productDetails = orphanedProducts.map(p => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      categoryId: p.categoryId,
      currentMerchantId: p.merchantId,
    }));

    if (!dryRun) {
      // Delete the orphaned products
      const deleteResult = await prisma.product.deleteMany({
        where: {
          id: {
            in: orphanedProducts.map(p => p.id)
          }
        }
      });

      return NextResponse.json({
        status: "success",
        message: `Deleted ${deleteResult.count} orphaned products`,
        deletedCount: deleteResult.count,
        products: productDetails,
      });
    }

    return NextResponse.json({
      status: "dry-run",
      message: `Found ${orphanedProducts.length} orphaned products to delete. Send {"dryRun": false, "oldMerchantId": "${oldMerchantId}"} to apply.`,
      orphanedCount: orphanedProducts.length,
      products: productDetails,
    });

  } catch (error) {
    logger.error("Error deleting orphaned products", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      {
        error: "Failed to delete orphaned products",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "POST /api/admin/delete-orphaned-products",
    description: "Delete orphaned products from old deleted merchants",
    usage: {
      dryRun: "POST with {\"dryRun\": true, \"oldMerchantId\": \"cmk3b94op0002ta1azvo8h8ki\"} to preview",
      apply: "POST with {\"dryRun\": false, \"oldMerchantId\": \"cmk3b94op0002ta1azvo8h8ki\"} to delete",
    },
    note: "The old merchant ID is the one that appears in product slugs (salla-MERCHANTID-...)",
  });
}
