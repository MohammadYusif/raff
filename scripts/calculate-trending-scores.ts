// scripts/calculate-trending-scores.ts
// PURPOSE: Calculate and update trending scores for all products
// SCHEDULE: Run this script every 1-6 hours via cron job

import { PrismaClient } from "@prisma/client";
import { createLogger } from "../src/lib/utils/logger";

const prisma = new PrismaClient();
const logger = createLogger("trending-calculator");

interface TrendingConfig {
  // Time decay: older events matter less
  decayHalfLifeHours: number; // How many hours until weight is halved

  // Event weights
  viewWeight: number;
  clickWeight: number;
  saveWeight: number;
  orderWeight: number;

  // Recency boost
  recentActivityBoostHours: number; // Boost for activity in last N hours
  recentActivityMultiplier: number; // Multiplier for recent activity

  // Minimum threshold
  minimumScore: number; // Products below this won't show as trending
}

const DEFAULT_CONFIG: TrendingConfig = {
  decayHalfLifeHours: 48, // 2 days
  viewWeight: 1.0,
  clickWeight: 5.0,
  saveWeight: 3.0,
  orderWeight: 10.0,
  recentActivityBoostHours: 24,
  recentActivityMultiplier: 1.5,
  minimumScore: 10,
};

/**
 * Calculate time decay factor using exponential decay
 * Formula: 2^(-hours_passed / half_life)
 */
function calculateDecayFactor(
  eventDate: Date,
  halfLifeHours: number
): number {
  const hoursPassed =
    (Date.now() - eventDate.getTime()) / (1000 * 60 * 60);
  return Math.pow(2, -hoursPassed / halfLifeHours);
}

/**
 * Calculate recency boost for very recent activity
 */
function calculateRecencyBoost(
  eventDate: Date,
  boostHours: number,
  multiplier: number
): number {
  const hoursPassed =
    (Date.now() - eventDate.getTime()) / (1000 * 60 * 60);
  if (hoursPassed <= boostHours) {
    return multiplier;
  }
  return 1.0;
}

/**
 * Calculate trending score for a single product
 */
async function calculateProductScore(
  productId: string,
  config: TrendingConfig
): Promise<number> {
  const lookbackDate = new Date();
  lookbackDate.setDate(lookbackDate.getDate() - 14); // Look back 14 days

  // Get all trending log events for this product
  const trendingEvents = await prisma.trendingLog.findMany({
    where: {
      productId,
      createdAt: {
        gte: lookbackDate,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Get click count (use OutboundClickEvent which has createdAt)
  const clickCount = await prisma.outboundClickEvent.count({
    where: {
      productId,
      createdAt: {
        gte: lookbackDate,
      },
    },
  });

  const orderCount = await prisma.order.count({
    where: {
      productId,
      createdAt: {
        gte: lookbackDate,
      },
    },
  });

  let totalScore = 0;

  // Calculate score from trending log events (views, saves)
  for (const event of trendingEvents) {
    const weight = event.weight;
    const decayFactor = calculateDecayFactor(
      event.createdAt,
      config.decayHalfLifeHours
    );
    const recencyBoost = calculateRecencyBoost(
      event.createdAt,
      config.recentActivityBoostHours,
      config.recentActivityMultiplier
    );

    totalScore += weight * decayFactor * recencyBoost;
  }

  // Add click contribution
  // We don't have individual click dates easily, so use a moderate decay
  totalScore += clickCount * config.clickWeight * 0.7; // 0.7 = moderate decay assumption

  // Add order contribution
  totalScore += orderCount * config.orderWeight * 0.8; // 0.8 = moderate decay assumption

  // Apply minimum threshold
  if (totalScore < config.minimumScore) {
    return 0;
  }

  return Math.round(totalScore * 100) / 100; // Round to 2 decimals
}

/**
 * Calculate velocity score (rate of change)
 * This helps identify fast-rising products
 */
async function calculateVelocityScore(productId: string): Promise<number> {
  const last24h = new Date();
  last24h.setHours(last24h.getHours() - 24);

  const last48h = new Date();
  last48h.setHours(last48h.getHours() - 48);

  const recent24hEvents = await prisma.trendingLog.count({
    where: {
      productId,
      createdAt: {
        gte: last24h,
      },
    },
  });

  const previous24hEvents = await prisma.trendingLog.count({
    where: {
      productId,
      createdAt: {
        gte: last48h,
        lt: last24h,
      },
    },
  });

  // Calculate velocity (rate of change)
  if (previous24hEvents === 0) {
    return recent24hEvents > 0 ? 100 : 0; // New trending item
  }

  const velocityPercentage =
    ((recent24hEvents - previous24hEvents) / previous24hEvents) * 100;

  return Math.max(0, velocityPercentage); // Only positive velocity
}

/**
 * Main function to calculate all trending scores
 */
async function calculateAllTrendingScores(config: TrendingConfig = DEFAULT_CONFIG) {
  logger.info("Starting trending score calculation", { config });

  try {
    // Get all active products that have some activity
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { viewCount: { gt: 0 } },
          { clickCount: { gt: 0 } },
          { orderCount: { gt: 0 } },
        ],
      },
      select: {
        id: true,
        title: true,
        viewCount: true,
        clickCount: true,
        orderCount: true,
      },
    });

    logger.info(`Found ${products.length} products with activity`);

    let updated = 0;
    let zeroed = 0;

    // Calculate scores for all products
    for (const product of products) {
      try {
        const score = await calculateProductScore(product.id, config);
        const velocity = await calculateVelocityScore(product.id);

        // Bonus: Add velocity boost for fast-rising products
        const velocityBonus = velocity > 50 ? score * 0.2 : 0;
        const finalScore = score + velocityBonus;

        await prisma.product.update({
          where: { id: product.id },
          data: {
            trendingScore: finalScore,
          },
        });

        if (finalScore > 0) {
          updated++;
          logger.debug("Updated trending score", {
            productId: product.id,
            title: product.title,
            score: finalScore,
            velocity: velocity.toFixed(2) + "%",
          });
        } else {
          zeroed++;
        }
      } catch (error) {
        logger.error("Failed to calculate score for product", {
          productId: product.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Zero out products with no recent activity
    const inactiveResult = await prisma.product.updateMany({
      where: {
        isActive: true,
        viewCount: 0,
        clickCount: 0,
        orderCount: 0,
      },
      data: {
        trendingScore: 0,
      },
    });

    logger.info("Trending score calculation complete", {
      totalProcessed: products.length,
      updated,
      zeroed,
      inactiveZeroed: inactiveResult.count,
      durationMs: "completed",
    });

    return {
      success: true,
      totalProcessed: products.length,
      updated,
      zeroed,
    };
  } catch (error) {
    logger.error("Trending score calculation failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  calculateAllTrendingScores()
    .then((result) => {
      console.log("✅ Trending scores calculated successfully");
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Failed to calculate trending scores:", error);
      process.exit(1);
    });
}

export { calculateAllTrendingScores, DEFAULT_CONFIG, type TrendingConfig };
