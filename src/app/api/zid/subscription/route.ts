import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SubscriptionStatus } from "@prisma/client";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("zid-subscription-webhook");

/**
 * Zid Subscription Webhook Handler
 *
 * Note: Zid may send subscription events for app installation/uninstallation.
 * Check Zid documentation for exact event names and payload structure.
 * This is a template based on common webhook patterns.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const eventType = payload.event || payload.event_type;
    const data = payload.data || payload;

    logger.info("Zid subscription event received", {
      eventType,
      storeId: data.store_id,
    });

    // Extract store ID
    const storeId = String(data.store_id || data.merchant_id || "");

    if (!storeId) {
      logger.error("Missing store ID in Zid webhook", { eventType });
      return NextResponse.json(
        { error: "Missing store ID" },
        { status: 400 }
      );
    }

    // Find merchant
    const merchant = await prisma.merchant.findUnique({
      where: { zidStoreId: storeId },
    });

    if (!merchant) {
      logger.warn("Merchant not found for Zid subscription webhook", {
        storeId,
        eventType,
      });
      return NextResponse.json(
        { error: "Merchant not found" },
        { status: 404 }
      );
    }

    // Handle subscription events
    // Note: Adjust event names based on actual Zid webhook events
    switch (eventType) {
      case "subscription.activated":
      case "subscription.started":
      case "app.installed":
        await prisma.merchant.update({
          where: { id: merchant.id },
          data: {
            subscriptionStatus: SubscriptionStatus.ACTIVE,
            subscriptionPlan: data.plan_name || data.plan || null,
            subscriptionStartDate: data.start_date
              ? new Date(data.start_date)
              : new Date(),
            subscriptionEndDate: data.end_date
              ? new Date(data.end_date)
              : null,
          },
        });
        logger.info("Zid subscription activated", {
          merchantId: merchant.id,
          plan: data.plan_name || data.plan,
        });
        break;

      case "subscription.renewed":
      case "subscription.updated":
        await prisma.merchant.update({
          where: { id: merchant.id },
          data: {
            subscriptionStatus: SubscriptionStatus.ACTIVE,
            subscriptionPlan: data.plan_name || data.plan || null,
            subscriptionEndDate: data.end_date
              ? new Date(data.end_date)
              : null,
          },
        });
        logger.info("Zid subscription renewed", {
          merchantId: merchant.id,
        });
        break;

      case "subscription.canceled":
      case "subscription.cancelled":
        await prisma.merchant.update({
          where: { id: merchant.id },
          data: {
            subscriptionStatus: SubscriptionStatus.CANCELED,
            subscriptionEndDate: data.end_date
              ? new Date(data.end_date)
              : null,
          },
        });
        logger.info("Zid subscription canceled", {
          merchantId: merchant.id,
        });
        break;

      case "subscription.expired":
      case "app.uninstalled":
        await prisma.merchant.update({
          where: { id: merchant.id },
          data: {
            subscriptionStatus: SubscriptionStatus.EXPIRED,
          },
        });
        logger.info("Zid subscription expired", {
          merchantId: merchant.id,
        });
        break;

      default:
        logger.warn("Unhandled Zid subscription event", { eventType });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Unknown error occurred";
    logger.error("Zid subscription webhook error", { error: errorMsg });
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
