// src/app/api/admin/clean-all-data/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/auth/admin-guard";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("api-admin-clean-all-data");


/**
 * Delete all products and categories to prepare for clean resync
 */

export async function POST(request: NextRequest) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  try {
    const { confirm = false } = await request.json().catch(() => ({ confirm: false }));

    if (!confirm) {
      return NextResponse.json({
        error: "Must send {\"confirm\": true} to delete all data",
        warning: "This will delete ALL products and categories!"
      }, { status: 400 });
    }

    // Count before deletion
    const productCount = await prisma.product.count();
    const categoryCount = await prisma.category.count();

    // Delete all products first (they reference categories)
    await prisma.product.deleteMany({});

    // Delete all categories
    await prisma.category.deleteMany({});

    return NextResponse.json({
      status: "success",
      message: "All products and categories deleted",
      deleted: {
        products: productCount,
        categories: categoryCount,
      },
    });

  } catch (error) {
    logger.error("Error cleaning data", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      {
        error: "Failed to clean data",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "POST /api/admin/clean-all-data",
    description: "Delete all products and categories",
    usage: {
      confirm: "POST with {\"confirm\": true} to delete all data",
    },
    warning: "This will delete ALL products and categories!",
  });
}
