// src/app/api/admin/calculate-trending/route.ts
// PURPOSE: Admin API endpoint to manually trigger trending score calculation
// SECURITY: Requires admin authentication

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { calculateAllTrendingScores, DEFAULT_CONFIG } from "../../../../../scripts/calculate-trending-scores";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("admin-trending-calc");

export async function POST() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      logger.warn("Unauthorized trending calculation attempt", {
        userId: session?.user?.id,
        role: session?.user?.role,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.info("Admin triggered trending score calculation", {
      adminId: session.user.id,
      adminEmail: session.user.email,
    });

    // Run the calculation
    const result = await calculateAllTrendingScores(DEFAULT_CONFIG);

    logger.info("Trending calculation completed via API", {
      result,
      triggeredBy: session.user.email,
    });

    return NextResponse.json({
      success: true,
      message: "Trending scores calculated successfully",
      result,
    });
  } catch (error) {
    logger.error("Trending calculation failed via API", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: "Failed to calculate trending scores",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// Optional: GET endpoint to check last calculation time
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get some stats about current trending products
    const { prisma } = await import("@/lib/prisma");

    const trendingCount = await prisma.product.count({
      where: {
        trendingScore: { gt: 0 },
        isActive: true,
      },
    });

    const topTrending = await prisma.product.findMany({
      where: {
        trendingScore: { gt: 0 },
        isActive: true,
      },
      select: {
        id: true,
        title: true,
        trendingScore: true,
        viewCount: true,
        clickCount: true,
        orderCount: true,
      },
      orderBy: {
        trendingScore: "desc",
      },
      take: 10,
    });

    return NextResponse.json({
      trendingCount,
      topTrending,
    });
  } catch (error) {
    logger.error("Failed to fetch trending stats", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: "Failed to fetch trending stats" },
      { status: 500 }
    );
  }
}
