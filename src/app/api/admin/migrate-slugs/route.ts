// src/app/api/admin/migrate-slugs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { requireAdminAuth } from "@/lib/auth/admin-guard";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("api-admin-migrate-slugs");


/**
 * Migrate existing product and category slugs to platform-independent format
 * - Categories: from "salla-merchantId-externalId-name" to "name"
 * - Products: from "salla-merchantId-productId-name" to "productId-name"
 */

export async function POST(request: NextRequest) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  try {
    const { dryRun = true } = await request.json().catch(() => ({ dryRun: true }));

    const updates = {
      categories: [] as Array<{ id: string; oldSlug: string; newSlug: string; name: string }>,
      products: [] as Array<{ id: string; oldSlug: string; newSlug: string; title: string }>,
    };

    // 1. Migrate categories
    const categories = await prisma.category.findMany({
      where: {
        slug: { contains: "salla-" }
      },
      select: { id: true, slug: true, name: true },
    });

    for (const category of categories) {
      // Extract name from slug: "salla-merchantId-externalId-البلايز" -> "البلايز"
      const slugParts = category.slug.split('-');
      const categoryName = slugParts[slugParts.length - 1];
      const newSlug = slugify(categoryName) || slugify(category.name) || "category";

      updates.categories.push({
        id: category.id,
        oldSlug: category.slug,
        newSlug,
        name: category.name,
      });

      if (!dryRun) {
        await prisma.category.update({
          where: { id: category.id },
          data: { slug: newSlug },
        });
      }
    }

    // 2. Migrate products
    const products = await prisma.product.findMany({
      where: {
        slug: { contains: "salla-" }
      },
      select: { id: true, slug: true, title: true, sallaProductId: true },
    });

    for (const product of products) {
      // Extract from slug: "salla-merchantId-productId-فستان" -> "productId-فستان"
      const parts = product.slug.split('-');

      // Find productId (it's after "salla-merchantId-")
      let productId = product.sallaProductId;
      let productName = product.title;

      // Try to extract from slug: assume format is salla-merchantId-productId-name
      if (parts.length >= 4) {
        productId = parts[2]; // third part is productId
        productName = parts.slice(3).join('-'); // rest is name
      }

      const safeName = slugify(productName) || slugify(product.title) || "product";
      const newSlug = `${productId}-${safeName}`;

      updates.products.push({
        id: product.id,
        oldSlug: product.slug,
        newSlug,
        title: product.title,
      });

      if (!dryRun) {
        await prisma.product.update({
          where: { id: product.id },
          data: { slug: newSlug },
        });
      }
    }

    return NextResponse.json({
      status: dryRun ? "dry-run" : "success",
      message: dryRun
        ? `Found ${categories.length} categories and ${products.length} products to migrate. Send {"dryRun": false} to apply.`
        : `Migrated ${categories.length} categories and ${products.length} products`,
      updates,
    });

  } catch (error) {
    logger.error("Error migrating slugs", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      {
        error: "Failed to migrate slugs",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "POST /api/admin/migrate-slugs",
    description: "Migrate product and category slugs to platform-independent format",
    usage: {
      dryRun: "POST with {\"dryRun\": true} to preview changes",
      apply: "POST with {\"dryRun\": false} to apply changes",
    },
  });
}
