// src/app/api/admin/clear-cache/route.ts
import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth/admin-guard";
import { createLogger } from "@/lib/utils/logger";
import { revalidatePath, revalidateTag } from "next/cache";

const logger = createLogger("admin-clear-cache");

export async function POST() {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  try {
    logger.info("Clearing application cache");

    // Revalidate common paths
    const pathsToRevalidate = [
      "/",
      "/products",
      "/trending",
      "/categories",
      "/merchants",
    ];

    // Revalidate cache tags
    const tagsToRevalidate = [
      "products",
      "trending",
      "categories",
      "merchants",
      "homepage",
    ];

    // Revalidate paths
    for (const path of pathsToRevalidate) {
      try {
        revalidatePath(path);
        logger.info(`Revalidated path: ${path}`);
      } catch {
        logger.warn(`Failed to revalidate path: ${path}`);
      }
    }

    // Revalidate tags
    for (const tag of tagsToRevalidate) {
      try {
        revalidateTag(tag, "max");
        logger.info(`Revalidated tag: ${tag}`);
      } catch {
        logger.warn(`Failed to revalidate tag: ${tag}`);
      }
    }

    logger.info("Cache cleared successfully");

    return NextResponse.json({
      success: true,
      message: "Cache cleared successfully",
      revalidatedPaths: pathsToRevalidate,
      revalidatedTags: tagsToRevalidate,
    });
  } catch (error) {
    logger.error("Failed to clear cache", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Failed to clear cache" },
      { status: 500 }
    );
  }
}
