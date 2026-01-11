import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SubscriptionStatus } from "@prisma/client";
import { createLogger } from "@/lib/utils/logger";
import crypto from "crypto";
import { getSallaWebhookConfig } from "@/lib/platform/config";

const logger = createLogger("salla-subscription-webhook");

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  return crypto.timingSafeEqual(bufA, bufB);
}

function normalizeHexSig(sig: string): string {
  const trimmed = sig.trim();
  const parts = trimmed.split("=");
  const candidate = parts.length === 2 ? parts[1] : trimmed;
  return candidate.trim().toLowerCase();
}

function hmacSha256(secret: string, rawBody: string): string {
  return crypto
    .createHmac("sha256", Buffer.from(secret, "utf8"))
    .update(rawBody, "utf8")
    .digest("hex");
}

export async function POST(request: NextRequest) {
  let rawBody = "";

  try {
    const webhookConfig = getSallaWebhookConfig();
    rawBody = await request.text();

    // Verify signature
    const headerName = webhookConfig.header ?? "x-salla-signature";
    const signatureRaw = request.headers.get(headerName);

    if (!webhookConfig.secret) {
      logger.error("SALLA_WEBHOOK_SECRET missing");
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 500 }
      );
    }

    if (!signatureRaw) {
      logger.error("Missing Salla signature header");
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    const provided = normalizeHexSig(signatureRaw);
    const expectedSignature = hmacSha256(webhookConfig.secret, rawBody);

    if (!timingSafeEqual(provided, expectedSignature)) {
      logger.error("Salla subscription webhook signature verification failed");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Parse payload
    const payload = JSON.parse(rawBody);
    const eventType = payload.event;
    const data = payload.data;

    logger.info("Subscription event received", {
      eventType,
      merchantId: data?.merchant?.id,
    });

    // Find merchant by Salla store ID
    const storeId = String(
      data?.merchant?.id || data?.store?.id || data?.store_id || ""
    );

    if (!storeId) {
      logger.error("Missing store ID in webhook", { eventType });
      return NextResponse.json(
        { error: "Missing store ID" },
        { status: 400 }
      );
    }

    const merchant = await prisma.merchant.findUnique({
      where: { sallaStoreId: storeId },
    });

    if (!merchant) {
      logger.warn("Merchant not found for subscription webhook", {
        storeId,
        eventType,
      });
      return NextResponse.json(
        { error: "Merchant not found" },
        { status: 404 }
      );
    }

    // Handle subscription events
    switch (eventType) {
      case "app.subscription.started":
        await prisma.merchant.update({
          where: { id: merchant.id },
          data: {
            subscriptionStatus: SubscriptionStatus.ACTIVE,
            subscriptionPlan: data.plan_name || null,
            subscriptionStartDate: data.start_date
              ? new Date(data.start_date)
              : new Date(),
            subscriptionEndDate: data.end_date
              ? new Date(data.end_date)
              : null,
          },
        });
        logger.info("Subscription started", {
          merchantId: merchant.id,
          plan: data.plan_name,
        });
        break;

      case "app.subscription.renewed":
        await prisma.merchant.update({
          where: { id: merchant.id },
          data: {
            subscriptionStatus: SubscriptionStatus.ACTIVE,
            subscriptionPlan: data.plan_name || null,
            subscriptionStartDate: data.renew_date
              ? new Date(data.renew_date)
              : new Date(),
            subscriptionEndDate: data.end_date
              ? new Date(data.end_date)
              : null,
          },
        });
        logger.info("Subscription renewed", {
          merchantId: merchant.id,
          plan: data.plan_name,
        });
        break;

      case "app.subscription.canceled":
        await prisma.merchant.update({
          where: { id: merchant.id },
          data: {
            subscriptionStatus: SubscriptionStatus.CANCELED,
            subscriptionEndDate: data.end_date
              ? new Date(data.end_date)
              : null,
          },
        });
        logger.info("Subscription canceled", { merchantId: merchant.id });
        break;

      case "app.subscription.expired":
        await prisma.merchant.update({
          where: { id: merchant.id },
          data: {
            subscriptionStatus: SubscriptionStatus.EXPIRED,
          },
        });
        logger.info("Subscription expired", { merchantId: merchant.id });
        break;

      default:
        logger.warn("Unhandled subscription event", { eventType });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Unknown error occurred";
    logger.error("Subscription webhook error", { error: errorMsg });
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
