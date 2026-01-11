import { NextResponse } from "next/server";
import { requireActiveSubscription } from "@/lib/services/subscription.service";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("subscription-middleware");

/**
 * Middleware to check if merchant has active subscription
 * Use this in API routes to protect merchant-only features
 */
export async function withSubscription(
  merchantId: string,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const subscription = await requireActiveSubscription(merchantId);

    logger.info("Subscription verified", {
      merchantId,
      plan: subscription.plan,
      endsAt: subscription.endsAt,
    });

    return await handler();
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Subscription check failed";

    logger.warn("Subscription check failed", {
      merchantId,
      error: errorMsg,
    });

    return NextResponse.json(
      {
        error: "Active subscription required",
        message:
          "Please subscribe to Raff on your platform's app store to access this feature.",
        subscriptionRequired: true,
      },
      { status: 403 }
    );
  }
}

/**
 * Get subscription status without throwing
 * Use this to show warnings or partial access
 */
export async function getSubscriptionStatus(merchantId: string) {
  try {
    const { checkMerchantSubscription } = await import(
      "@/lib/services/subscription.service"
    );
    return await checkMerchantSubscription(merchantId);
  } catch (error) {
    logger.error("Failed to check subscription status", {
      merchantId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
