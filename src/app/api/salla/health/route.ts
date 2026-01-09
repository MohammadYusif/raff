// src/app/api/salla/health/route.ts
/**
 * Health check endpoint for Salla integration
 *
 * Verifies:
 * - Database connectivity
 * - Configuration validity
 * - Recent webhook processing health
 * - Token refresh status
 *
 * Usage: GET /api/salla/health
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSallaConfig } from "@/lib/platform/config";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("salla-health");

export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, { status: "healthy" | "degraded" | "unhealthy"; message?: string; duration?: number }> = {};

  try {
    // Check 1: Database connectivity
    const dbCheckStart = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = {
        status: "healthy",
        duration: Date.now() - dbCheckStart,
      };
    } catch (error) {
      checks.database = {
        status: "unhealthy",
        message: error instanceof Error ? error.message : "Database connection failed",
        duration: Date.now() - dbCheckStart,
      };
    }

    // Check 2: Configuration
    const configCheckStart = Date.now();
    try {
      const config = getSallaConfig();
      const missingVars: string[] = [];

      if (!config.clientId) missingVars.push("SALLA_CLIENT_ID");
      if (!config.clientSecret) missingVars.push("SALLA_CLIENT_SECRET");
      if (!config.apiBaseUrl) missingVars.push("SALLA_API_BASE_URL");
      if (!config.authUrl) missingVars.push("SALLA_AUTH_URL");
      if (!config.tokenUrl) missingVars.push("SALLA_TOKEN_URL");

      if (missingVars.length > 0) {
        checks.configuration = {
          status: "unhealthy",
          message: `Missing required environment variables: ${missingVars.join(", ")}`,
          duration: Date.now() - configCheckStart,
        };
      } else {
        checks.configuration = {
          status: "healthy",
          duration: Date.now() - configCheckStart,
        };
      }
    } catch (error) {
      checks.configuration = {
        status: "unhealthy",
        message: error instanceof Error ? error.message : "Configuration error",
        duration: Date.now() - configCheckStart,
      };
    }

    // Check 3: Recent webhook processing (last 24 hours)
    const webhookCheckStart = Date.now();
    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const [totalCount, failedCount] = await Promise.all([
        prisma.webhookEvent.count({
          where: {
            createdAt: {
              gte: yesterday,
            },
          },
        }),
        prisma.webhookEvent.count({
          where: {
            createdAt: {
              gte: yesterday,
            },
            processingStatus: "FAILED",
          },
        }),
      ]);

      const total = totalCount;
      const failed = failedCount;
      const failureRate = total > 0 ? failed / total : 0;

      if (total === 0) {
        checks.webhooks = {
          status: "healthy",
          message: "No webhooks in last 24 hours",
          duration: Date.now() - webhookCheckStart,
        };
      } else if (failureRate > 0.1) {
        checks.webhooks = {
          status: "degraded",
          message: `High failure rate: ${(failureRate * 100).toFixed(1)}% (${failed}/${total})`,
          duration: Date.now() - webhookCheckStart,
        };
      } else {
        checks.webhooks = {
          status: "healthy",
          message: `${total} webhooks processed, ${(((total - failed) / total) * 100).toFixed(1)}% success rate`,
          duration: Date.now() - webhookCheckStart,
        };
      }
    } catch (error) {
      checks.webhooks = {
        status: "unhealthy",
        message: error instanceof Error ? error.message : "Webhook check failed",
        duration: Date.now() - webhookCheckStart,
      };
    }

    // Check 4: Active merchant count and token health
    const merchantCheckStart = Date.now();
    try {
      const activeMerchants = await prisma.merchant.count({
        where: {
          isActive: true,
          sallaStoreId: { not: null },
        },
      });

      const merchantsWithExpiredTokens = await prisma.merchant.count({
        where: {
          isActive: true,
          sallaStoreId: { not: null },
          sallaTokenExpiry: {
            lte: new Date(),
          },
        },
      });

      if (merchantsWithExpiredTokens > activeMerchants * 0.2) {
        checks.merchants = {
          status: "degraded",
          message: `${merchantsWithExpiredTokens}/${activeMerchants} merchants have expired tokens`,
          duration: Date.now() - merchantCheckStart,
        };
      } else {
        checks.merchants = {
          status: "healthy",
          message: `${activeMerchants} active merchants`,
          duration: Date.now() - merchantCheckStart,
        };
      }
    } catch (error) {
      checks.merchants = {
        status: "unhealthy",
        message: error instanceof Error ? error.message : "Merchant check failed",
        duration: Date.now() - merchantCheckStart,
      };
    }

    // Determine overall status
    const hasUnhealthy = Object.values(checks).some((check) => check.status === "unhealthy");
    const hasDegraded = Object.values(checks).some((check) => check.status === "degraded");

    const overallStatus = hasUnhealthy ? "unhealthy" : hasDegraded ? "degraded" : "healthy";
    const statusCode = hasUnhealthy ? 503 : hasDegraded ? 200 : 200;

    const response = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      checks,
      metadata: {
        version: "1.0.0",
        environment: process.env.NODE_ENV || "development",
      },
    };

    logger.info("Health check completed", {
      status: overallStatus,
      duration: response.duration,
    });

    return NextResponse.json(response, { status: statusCode });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    logger.error("Health check failed", { error: errorMsg });

    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        error: errorMsg,
        checks,
      },
      { status: 503 }
    );
  }
}
