import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkMerchantSubscription,
  isSubscriptionExpiringSoon,
} from "@/lib/services/subscription.service";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("api-merchant-subscription-status");

/**
 * GET /api/merchant/subscription/status
 * Check current subscription status for the logged-in merchant
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find merchant profile
    const merchant = await prisma.merchant.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        name: true,
        subscriptionStatus: true,
        subscriptionPlan: true,
        subscriptionStartDate: true,
        subscriptionEndDate: true,
        lastSubscriptionCheckAt: true,
        sallaStoreId: true,
        zidStoreId: true,
      },
    });

    if (!merchant) {
      return NextResponse.json(
        { error: "Merchant profile not found" },
        { status: 404 }
      );
    }

    // Check if we should refresh subscription status
    // Refresh if: never checked OR last check > 1 hour ago
    const shouldRefresh =
      !merchant.lastSubscriptionCheckAt ||
      Date.now() - merchant.lastSubscriptionCheckAt.getTime() >
        60 * 60 * 1000;

    let subscriptionData;

    if (shouldRefresh) {
      // Fetch fresh data from platform API
      subscriptionData = await checkMerchantSubscription(merchant.id);
    } else {
      // Use cached data
      subscriptionData = {
        isSubscribed:
          merchant.subscriptionStatus === "ACTIVE" &&
          (!merchant.subscriptionEndDate ||
            merchant.subscriptionEndDate > new Date()),
        status: merchant.subscriptionStatus,
        plan: merchant.subscriptionPlan,
        endsAt: merchant.subscriptionEndDate,
      };
    }

    // Check if subscription is expiring soon
    const expiringSoon = await isSubscriptionExpiringSoon(merchant.id);

    return NextResponse.json({
      merchant: {
        id: merchant.id,
        name: merchant.name,
      },
      subscription: {
        isActive: subscriptionData.isSubscribed,
        status: subscriptionData.status,
        plan: subscriptionData.plan,
        startDate: merchant.subscriptionStartDate,
        endDate: subscriptionData.endsAt,
        expiringSoon,
      },
      platform: merchant.sallaStoreId ? "salla" : "zid",
      lastChecked: new Date(),
    });
  } catch (error) {
    logger.error("Subscription status check failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      {
        error: "Failed to check subscription status",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/merchant/subscription/status
 * Force refresh subscription status from platform API
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchant = await prisma.merchant.findUnique({
      where: { userId: session.user.id },
      select: { id: true, name: true },
    });

    if (!merchant) {
      return NextResponse.json(
        { error: "Merchant profile not found" },
        { status: 404 }
      );
    }

    // Force refresh from platform
    const subscriptionData = await checkMerchantSubscription(merchant.id);

    return NextResponse.json({
      merchant: {
        id: merchant.id,
        name: merchant.name,
      },
      subscription: {
        isActive: subscriptionData.isSubscribed,
        status: subscriptionData.status,
        plan: subscriptionData.plan,
        endsAt: subscriptionData.endsAt,
      },
      refreshed: true,
      lastChecked: new Date(),
    });
  } catch (error) {
    logger.error("Subscription refresh failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      {
        error: "Failed to refresh subscription",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
