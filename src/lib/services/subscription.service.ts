import { prisma } from "@/lib/prisma";
import { SubscriptionStatus } from "@prisma/client";
import { createLogger } from "@/lib/utils/logger";
import { normalizeZidAuthorizationToken } from "@/lib/zid/tokens";

const logger = createLogger("subscription-service");

interface SubscriptionCheckResult {
  isSubscribed: boolean;
  status: SubscriptionStatus;
  plan: string | null;
  endsAt: Date | null;
}

/**
 * Check Salla subscription status
 */
export async function checkSallaSubscription(
  merchantId: string
): Promise<SubscriptionCheckResult> {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: {
      sallaAccessToken: true,
      sallaStoreId: true,
      subscriptionStatus: true,
      subscriptionEndDate: true,
    },
  });

  if (!merchant?.sallaAccessToken || !merchant.sallaStoreId) {
    logger.warn("Merchant missing Salla credentials", { merchantId });
    return {
      isSubscribed: false,
      status: SubscriptionStatus.INACTIVE,
      plan: null,
      endsAt: null,
    };
  }

  try {
    const appId = process.env.SALLA_APP_ID!;
    const response = await fetch(
      `https://api.salla.dev/admin/v2/apps/${appId}/subscriptions`,
      {
        headers: {
          Authorization: `Bearer ${merchant.sallaAccessToken}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      logger.error("Salla subscription API failed", {
        merchantId,
        status: response.status,
        statusText: response.statusText,
      });
      throw new Error(`Salla API error: ${response.status}`);
    }

    const data = await response.json();
    const subscriptions = data.data || [];

    // Find active recurring subscription
    const now = new Date();
    const activeSubscription = subscriptions.find(
      (sub: { end_date: string; plan_type: string }) => {
        const endDate = new Date(sub.end_date);
        return (
          endDate > now &&
          (sub.plan_type === "recurring" || sub.plan_type === "once")
        );
      }
    );

    const status: SubscriptionStatus = activeSubscription
      ? SubscriptionStatus.ACTIVE
      : SubscriptionStatus.INACTIVE;
    const endsAt = activeSubscription
      ? new Date(activeSubscription.end_date)
      : null;
    const plan = activeSubscription?.plan_name || null;

    // Update merchant record
    await prisma.merchant.update({
      where: { id: merchantId },
      data: {
        subscriptionStatus: status,
        subscriptionPlan: plan,
        subscriptionStartDate: activeSubscription
          ? new Date(activeSubscription.start_date)
          : null,
        subscriptionEndDate: endsAt,
        lastSubscriptionCheckAt: new Date(),
      },
    });

    logger.info("Salla subscription checked", {
      merchantId,
      status,
      plan,
      endsAt,
    });

    return {
      isSubscribed: status === SubscriptionStatus.ACTIVE,
      status,
      plan,
      endsAt,
    };
  } catch (error) {
    logger.error("Salla subscription check failed", {
      merchantId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Check Zid subscription status
 */
export async function checkZidSubscription(
  merchantId: string
): Promise<SubscriptionCheckResult> {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: {
      zidAccessToken: true,
      zidManagerToken: true,
      zidStoreId: true,
      subscriptionStatus: true,
      subscriptionEndDate: true,
    },
  });

  if (
    !merchant?.zidAccessToken ||
    !merchant.zidManagerToken ||
    !merchant.zidStoreId
  ) {
    logger.warn("Merchant missing Zid credentials", { merchantId });
    return {
      isSubscribed: false,
      status: SubscriptionStatus.INACTIVE,
      plan: null,
      endsAt: null,
    };
  }

  const authorizationToken = normalizeZidAuthorizationToken(
    merchant.zidAccessToken
  );
  if (!authorizationToken) {
    logger.warn("Merchant has invalid Zid authorization token", { merchantId });
    return {
      isSubscribed: false,
      status: SubscriptionStatus.INACTIVE,
      plan: null,
      endsAt: null,
    };
  }

  try {
    const appId = process.env.ZID_APP_ID!;

    // Zid requires form-encoded body
    const formData = new URLSearchParams();
    formData.append("app_id", appId);

    const response = await fetch(
      "https://api.zid.sa/v1/market/app/subscription",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authorizationToken}`,
          "X-Manager-Token": merchant.zidManagerToken,
          Accept: "application/json",
          "Accept-Language": "en",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      }
    );

    if (!response.ok) {
      logger.error("Zid subscription API failed", {
        merchantId,
        status: response.status,
        statusText: response.statusText,
      });
      throw new Error(`Zid API error: ${response.status}`);
    }

    const data = await response.json();
    const subscription = data.subscription;

    if (!subscription) {
      logger.info("No Zid subscription found", { merchantId });
      await prisma.merchant.update({
        where: { id: merchantId },
        data: {
          subscriptionStatus: SubscriptionStatus.INACTIVE,
          lastSubscriptionCheckAt: new Date(),
        },
      });
      return {
        isSubscribed: false,
        status: SubscriptionStatus.INACTIVE,
        plan: null,
        endsAt: null,
      };
    }

    const isActive = subscription.subscription_status === "active";
    const status: SubscriptionStatus = isActive
      ? SubscriptionStatus.ACTIVE
      : SubscriptionStatus.INACTIVE;
    const endsAt = subscription.end_date
      ? new Date(subscription.end_date)
      : null;
    const plan = subscription.plan_name || null;

    // Update merchant record
    await prisma.merchant.update({
      where: { id: merchantId },
      data: {
        subscriptionStatus: status,
        subscriptionPlan: plan,
        subscriptionStartDate: subscription.start_date
          ? new Date(subscription.start_date)
          : null,
        subscriptionEndDate: endsAt,
        lastSubscriptionCheckAt: new Date(),
      },
    });

    logger.info("Zid subscription checked", {
      merchantId,
      status,
      plan,
      endsAt,
    });

    return {
      isSubscribed: status === SubscriptionStatus.ACTIVE,
      status,
      plan,
      endsAt,
    };
  } catch (error) {
    logger.error("Zid subscription check failed", {
      merchantId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Check subscription status for any platform
 */
export async function checkMerchantSubscription(
  merchantId: string
): Promise<SubscriptionCheckResult> {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: {
      sallaStoreId: true,
      zidStoreId: true,
    },
  });

  if (!merchant) {
    throw new Error("Merchant not found");
  }

  // Check Salla first, then Zid
  if (merchant.sallaStoreId) {
    return checkSallaSubscription(merchantId);
  } else if (merchant.zidStoreId) {
    return checkZidSubscription(merchantId);
  }

  throw new Error("Merchant has no platform integration");
}

/**
 * Require active subscription (throws if not subscribed)
 */
export async function requireActiveSubscription(
  merchantId: string
): Promise<SubscriptionCheckResult> {
  const result = await checkMerchantSubscription(merchantId);

  if (!result.isSubscribed) {
    throw new Error(
      "Active subscription required. Please subscribe on your platform's app store."
    );
  }

  return result;
}

/**
 * Check if subscription is expiring soon (within 7 days)
 */
export async function isSubscriptionExpiringSoon(
  merchantId: string
): Promise<boolean> {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { subscriptionEndDate: true, subscriptionStatus: true },
  });

  if (
    !merchant?.subscriptionEndDate ||
    merchant.subscriptionStatus !== SubscriptionStatus.ACTIVE
  ) {
    return false;
  }

  const daysUntilExpiry =
    (merchant.subscriptionEndDate.getTime() - Date.now()) /
    (1000 * 60 * 60 * 24);

  return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
}
