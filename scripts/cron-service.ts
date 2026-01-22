// scripts/cron-service.ts
// Railway Cron Service - runs scheduled tasks
// Usage: npm run cron:service

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Configuration
const TRENDING_INTERVAL_HOURS = 3; // Run trending calculation every 3 hours
const CLEANUP_INTERVAL_HOURS = 24; // Run cleanup once a day
const WEBHOOK_RETENTION_DAYS = 90; // Keep webhook events for 90 days

function log(message: string, data?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    service: "cron-service",
    message,
    ...data,
  };
  console.log(JSON.stringify(entry));
}

async function calculateTrendingScores() {
  log("Starting trending score calculation");
  const startTime = Date.now();

  try {
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - 14); // 14 day lookback

    // Get all active products
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        createdAt: true,
        clickTrackings: {
          where: { clickedAt: { gte: lookbackDate } },
          select: { id: true },
        },
      },
    });

    log(`Processing ${products.length} products`);

    // Get trending logs separately (grouped by product and event type)
    const trendingLogs = await prisma.trendingLog.groupBy({
      by: ["productId", "eventType"],
      where: { createdAt: { gte: lookbackDate } },
      _count: true,
    });

    // Create a map of product engagement
    const engagementMap = new Map<string, { views: number; orders: number }>();
    for (const entry of trendingLogs) {
      const current = engagementMap.get(entry.productId) || { views: 0, orders: 0 };
      if (entry.eventType === "VIEW") {
        current.views = entry._count;
      } else if (entry.eventType === "ORDER") {
        current.orders = entry._count;
      }
      engagementMap.set(entry.productId, current);
    }

    // Calculate scores
    const now = new Date();
    let updatedCount = 0;

    for (const product of products) {
      const engagement = engagementMap.get(product.id) || { views: 0, orders: 0 };
      const clicks = product.clickTrackings.length;

      // Time decay - newer products get a boost
      const ageInDays = Math.floor((now.getTime() - product.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      const recencyBoost = Math.max(0, 1 - ageInDays / 30); // Decays over 30 days

      // Weighted score
      const score = Math.round(
        engagement.views * 1 +
        clicks * 5 +
        engagement.orders * 50 +
        recencyBoost * 10
      );

      await prisma.product.update({
        where: { id: product.id },
        data: { trendingScore: score },
      });
      updatedCount++;
    }

    const duration = Date.now() - startTime;
    log("Trending calculation completed", { updatedCount, durationMs: duration });
  } catch (error) {
    log("Trending calculation failed", {
      error: error instanceof Error ? error.message : "Unknown error"
    });
    throw error;
  }
}

async function cleanupWebhookEvents() {
  log("Starting webhook cleanup");
  const startTime = Date.now();

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - WEBHOOK_RETENTION_DAYS);

    const result = await prisma.webhookEvent.deleteMany({
      where: { createdAt: { lt: cutoffDate } },
    });

    const duration = Date.now() - startTime;
    log("Webhook cleanup completed", {
      deletedCount: result.count,
      retentionDays: WEBHOOK_RETENTION_DAYS,
      durationMs: duration
    });
  } catch (error) {
    log("Webhook cleanup failed", {
      error: error instanceof Error ? error.message : "Unknown error"
    });
    throw error;
  }
}

async function cleanupExpiredOTPs() {
  log("Starting OTP cleanup");
  const startTime = Date.now();

  try {
    const result = await prisma.emailOTP.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    const duration = Date.now() - startTime;
    log("OTP cleanup completed", { deletedCount: result.count, durationMs: duration });
  } catch (error) {
    log("OTP cleanup failed", {
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

async function cleanupOldTrendingLogs() {
  log("Starting trending log cleanup");
  const startTime = Date.now();

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // Keep 30 days

    const result = await prisma.trendingLog.deleteMany({
      where: { createdAt: { lt: cutoffDate } },
    });

    const duration = Date.now() - startTime;
    log("Trending log cleanup completed", { deletedCount: result.count, durationMs: duration });
  } catch (error) {
    log("Trending log cleanup failed", {
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

async function cleanupOldWebhookLogs() {
  log("Starting webhook log cleanup");
  const startTime = Date.now();

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // Keep 30 days

    const result = await prisma.webhookLog.deleteMany({
      where: { processedAt: { lt: cutoffDate } },
    });

    const duration = Date.now() - startTime;
    log("Webhook log cleanup completed", { deletedCount: result.count, durationMs: duration });
  } catch (error) {
    log("Webhook log cleanup failed", {
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

// Track last run times
let lastTrendingRun = 0;
let lastCleanupRun = 0;

async function runScheduledTasks() {
  const now = Date.now();

  // Run trending calculation every N hours
  if (now - lastTrendingRun >= TRENDING_INTERVAL_HOURS * 60 * 60 * 1000) {
    try {
      await calculateTrendingScores();
      lastTrendingRun = now;
    } catch {
      // Error already logged
    }
  }

  // Run cleanup tasks once a day
  if (now - lastCleanupRun >= CLEANUP_INTERVAL_HOURS * 60 * 60 * 1000) {
    try {
      await cleanupWebhookEvents();
      await cleanupExpiredOTPs();
      await cleanupOldTrendingLogs();
      await cleanupOldWebhookLogs();
      lastCleanupRun = now;
    } catch {
      // Errors already logged
    }
  }
}

async function main() {
  log("Cron service starting", {
    trendingIntervalHours: TRENDING_INTERVAL_HOURS,
    cleanupIntervalHours: CLEANUP_INTERVAL_HOURS,
    webhookRetentionDays: WEBHOOK_RETENTION_DAYS,
  });

  // Run immediately on startup
  await runScheduledTasks();

  // Then check every 5 minutes
  const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

  setInterval(async () => {
    try {
      await runScheduledTasks();
    } catch (error) {
      log("Scheduled task error", {
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }, CHECK_INTERVAL);

  log("Cron service running - checking every 5 minutes");
}

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  log("Received SIGTERM, shutting down gracefully");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  log("Received SIGINT, shutting down gracefully");
  await prisma.$disconnect();
  process.exit(0);
});

main().catch(async (error) => {
  log("Cron service fatal error", {
    error: error instanceof Error ? error.message : "Unknown error"
  });
  await prisma.$disconnect();
  process.exit(1);
});
