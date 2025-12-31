// src/app/api/zid/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { CommissionStatus, type Merchant } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getZidWebhookConfig } from "@/lib/platform/config";
import {
  syncZidProductById,
  deactivateZidProduct,
} from "@/lib/services/zid.service";
import {
  normalizeZidOrderWebhook,
  logProcessedWebhook,
  isValidRaffReferrer,
  isPaymentConfirmed,
  verifySignature,
  SignatureConfig,
} from "@/lib/platform/webhook-normalizer";

/**
 * Process order webhook with proper conversion tracking
 * - Idempotent via DB constraints (Commission @@unique([merchantId, orderId]))
 * - Allows PENDING → APPROVED upgrades on later events
 */
async function processOrderWebhook(
  normalized: NonNullable<ReturnType<typeof normalizeZidOrderWebhook>>,
  merchant: Merchant
): Promise<{ success: boolean; message: string; commission?: number }> {
  // Validate referrer code
  if (
    !normalized.referrerCode ||
    !isValidRaffReferrer(normalized.referrerCode)
  ) {
    return { success: true, message: "No valid Raff referrer code" };
  }

  // Try to find click tracking (allow already-converted too; we may need it for updates)
  let clickTracking = await prisma.clickTracking.findFirst({
    where: {
      trackingId: normalized.referrerCode,
      merchantId: merchant.id,
      expiresAt: { gte: new Date() },
    },
  });

  // Fallback: look for existing commission by merchantId + orderId
  if (!clickTracking) {
    const existingCommission = await prisma.commission.findUnique({
      where: {
        merchantId_orderId: {
          merchantId: merchant.id,
          orderId: normalized.orderId,
        },
      },
      include: { clickTracking: true },
    });

    if (existingCommission?.clickTracking) {
      clickTracking = existingCommission.clickTracking;
      console.log(
        `ĐY"O Found existing commission for order ${normalized.orderId}, will update status if needed`
      );
    }
  }

  if (!clickTracking) {
    // Not an error ƒ?" could be an order not coming from Raff
    return { success: true, message: "No matching click tracking found" };
  }

  const paymentConfirmed = isPaymentConfirmed(
    normalized.paymentStatus,
    normalized.orderStatus
  );

  const commissionRate =
    clickTracking.commissionRate ?? merchant.commissionRate;
  const commissionAmount = (normalized.total * Number(commissionRate)) / 100;

  const existingOrderCommission = await prisma.commission.findUnique({
    where: {
      merchantId_orderId: {
        merchantId: merchant.id,
        orderId: normalized.orderId,
      },
    },
    select: { id: true, status: true },
  });

  const isDev = process.env.NODE_ENV !== "production";
  const riskEnabled = process.env.ENABLE_RISK_SCORING === "true";
  const riskThreshold = Number(
    process.env.RISK_SCORE_THRESHOLD ?? (isDev ? "999" : "70")
  );
  const trackingWindowMinutes = Number(
    process.env.RISK_TRACKING_WINDOW_MINUTES ?? (isDev ? "999" : "10")
  );
  const trackingOrderThreshold = Number(
    process.env.RISK_TRACKING_ORDER_THRESHOLD ?? (isDev ? "999" : "3")
  );
  let riskScore = 0;
  const fraudSignals: Array<{
    signalType: "HIGH_FREQUENCY_ORDERS";
    severity: "LOW" | "MEDIUM" | "HIGH";
    score: number;
    reason: string;
    metadata: Record<string, unknown>;
  }> = [];

  if (riskEnabled) {
    const windowStart = new Date(
      Date.now() - trackingWindowMinutes * 60 * 1000
    );
    const recentOrders = await prisma.commission.count({
      where: {
        clickTrackingId: clickTracking.id,
        createdAt: { gte: windowStart },
      },
    });
    const orderCount = recentOrders + (existingOrderCommission ? 0 : 1);

    if (orderCount >= trackingOrderThreshold) {
      const score = 70;
      riskScore += score;
      fraudSignals.push({
        signalType: "HIGH_FREQUENCY_ORDERS",
        severity: "HIGH",
        score,
        reason: `High frequency orders: ${orderCount} in ${trackingWindowMinutes}m`,
        metadata: {
          trackingId: clickTracking.trackingId,
          orderCount,
          windowMinutes: trackingWindowMinutes,
        },
      });
    }
  }

  if (riskScore > 100) {
    riskScore = 100;
  }

  const desiredStatus: CommissionStatus =
    riskEnabled && riskScore >= riskThreshold
      ? CommissionStatus.ON_HOLD
      : paymentConfirmed
        ? CommissionStatus.APPROVED
        : CommissionStatus.PENDING;

  const mergeStatus = (
    current: CommissionStatus | null | undefined,
    next: CommissionStatus
  ): CommissionStatus => {
    if (current === CommissionStatus.PAID) return CommissionStatus.PAID;
    if (current === CommissionStatus.APPROVED) {
      return CommissionStatus.APPROVED;
    }
    if (current === CommissionStatus.ON_HOLD) {
      return next === CommissionStatus.APPROVED
        ? CommissionStatus.APPROVED
        : CommissionStatus.ON_HOLD;
    }
    return next;
  };

  const status = mergeStatus(
    existingOrderCommission?.status ?? null,
    desiredStatus
  );

  // Only mark click as converted if payment is confirmed
  if (paymentConfirmed && !clickTracking.converted) {
    await prisma.clickTracking.update({
      where: { id: clickTracking.id },
      data: {
        converted: true,
        conversionValue: normalized.total,
        commissionValue: commissionAmount,
        commissionRate: commissionRate,
        convertedAt: new Date(),
      },
    });
  }

  // Upsert commission by (merchantId + orderId) to prevent duplicates
  const commission = await prisma.commission.upsert({
    where: {
      merchantId_orderId: {
        merchantId: merchant.id,
        orderId: normalized.orderId,
      },
    },
    create: {
      clickTrackingId: clickTracking.id,
      merchantId: merchant.id,
      orderId: normalized.orderId,
      orderTotal: normalized.total,
      orderCurrency: normalized.currency,
      commissionRate: commissionRate,
      commissionAmount: commissionAmount,
      status,
    },
    update: {
      orderTotal: normalized.total,
      orderCurrency: normalized.currency,
      commissionRate: commissionRate,
      commissionAmount: commissionAmount,
      status,
    },
  });

  if (riskEnabled && fraudSignals.length && riskScore >= riskThreshold) {
    for (const signal of fraudSignals) {
      const existingSignal = await prisma.fraudSignal.findFirst({
        where: {
          commissionId: commission.id,
          signalType: signal.signalType,
        },
      });

      if (!existingSignal) {
        await prisma.fraudSignal.create({
          data: {
            merchantId: merchant.id,
            platform: normalized.platform,
            storeId: normalized.storeId,
            clickTrackingId: clickTracking.id,
            orderId: normalized.orderId,
            commissionId: commission.id,
            signalType: signal.signalType,
            severity: signal.severity,
            score: signal.score,
            reason: signal.reason,
            metadata: {
              ...signal.metadata,
              riskScore,
            },
          },
        });
      }
    }
  }

  console.log(
    `✅ Commission ${status}: ${commissionAmount} ${normalized.currency} for order ${normalized.orderId}`
  );

  return {
    success: true,
    message: `Commission ${status.toLowerCase()}`,
    commission: Number(commissionAmount),
  };
}

export async function POST(request: NextRequest) {
  let normalized: ReturnType<typeof normalizeZidOrderWebhook> | null = null;
  let merchantId: string | null = null;

  // logging control
  let processedOk = false;
  let errorMessage: string | undefined;
  let shouldLog = false;

  try {
    const webhookConfig = getZidWebhookConfig();
    const isProd = process.env.NODE_ENV === "production";
    const skipVerification =
      !isProd && process.env.SKIP_WEBHOOK_VERIFICATION === "true";
    const canVerify = !!(webhookConfig.secret && webhookConfig.header);

    if (isProd && !skipVerification && !canVerify) {
      console.error("Zid webhook config missing in production");
      errorMessage = "Webhook not configured";
      processedOk = false;
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 500 }
      );
    }

    const rawBody = await request.text();

    if (canVerify && !skipVerification) {
      const signature = request.headers.get(webhookConfig.header!);

      if (!signature) {
        console.error("Zid webhook signature missing");
        errorMessage = "Missing signature";
        processedOk = false;
        return NextResponse.json({ error: "Missing signature" }, { status: 401 });
      }

      const signatureConfig: SignatureConfig = {
        mode: webhookConfig.signatureMode ?? "plain",
        secret: webhookConfig.secret!,
      };

      if (!verifySignature(signature, signatureConfig, rawBody)) {
        console.error("Zid webhook signature verification failed");
        errorMessage = "Invalid signature";
        processedOk = false;
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    } else {
      console.log("Zid webhook verification skipped");
    }

    const payload = JSON.parse(rawBody);
    const eventType = String(payload.event ?? payload.event_type ?? "")
      .trim()
      .toLowerCase();

    console.log(`📥 Zid webhook received: ${eventType}`);

    // ============================================
    // PRODUCT EVENTS
    // ============================================
    if (
      eventType === "product.created" ||
      eventType === "product.create" ||
      eventType === "product.updated" ||
      eventType === "product.update"
    ) {
      const productId = payload.product_id ?? payload.data?.id;
      const storeId = payload.store_id ?? payload.data?.store_id;

      if (!productId || !storeId) {
        console.error("❌ Missing product_id or store_id in payload");
        processedOk = false;
        return NextResponse.json({ error: "Missing data" }, { status: 400 });
      }

      const merchant = await prisma.merchant.findUnique({
        where: { zidStoreId: storeId },
      });

      if (!merchant) {
        console.error(`❌ Merchant not found for store_id: ${storeId}`);
        processedOk = false;
        return NextResponse.json(
          { error: "Merchant not found" },
          { status: 404 }
        );
      }

      const syncDisabled =
        (!isProd && process.env.SKIP_PLATFORM_SYNC === "true") ||
        !merchant.zidAccessToken ||
        !process.env.ZID_CLIENT_ID ||
        !process.env.ZID_CLIENT_SECRET ||
        !process.env.ZID_API_BASE_URL;

      if (syncDisabled) {
        console.log("Zid product sync skipped (missing API config)");
        processedOk = true;
        return NextResponse.json({
          success: true,
          message: "Product sync skipped in development",
        });
      }

      await syncZidProductById(merchant, productId.toString());

      processedOk = true;
      return NextResponse.json({
        success: true,
        message: "Product synced successfully",
      });
    }

    // ============================================
    // PRODUCT DELETE EVENTS
    // ============================================
    if (
      eventType === "product.deleted" ||
      eventType === "product.delete" ||
      eventType === "product.removed" ||
      eventType === "product.remove"
    ) {
      const productId = payload.product_id ?? payload.data?.id;
      const storeId = payload.store_id ?? payload.data?.store_id;

      if (!productId || !storeId) {
        console.error("❌ Missing product_id or store_id in delete payload");
        processedOk = false;
        return NextResponse.json({ error: "Missing data" }, { status: 400 });
      }

      const merchant = await prisma.merchant.findUnique({
        where: { zidStoreId: storeId },
      });

      if (!merchant) {
        console.error(`❌ Merchant not found for store_id: ${storeId}`);
        processedOk = false;
        return NextResponse.json(
          { error: "Merchant not found" },
          { status: 404 }
        );
      }

      await deactivateZidProduct(merchant.id, productId.toString());

      processedOk = true;
      return NextResponse.json({
        success: true,
        message: "Product deactivated successfully",
      });
    }

    // ============================================
    // ORDER EVENTS
    // ============================================
    if (
      eventType === "order.created" ||
      eventType === "order.create" ||
      eventType === "order.updated" ||
      eventType === "order.update" ||
      eventType === "order.paid" ||
      eventType === "order.payment_status.update" ||
      eventType === "order.status.update"
    ) {
      normalized = normalizeZidOrderWebhook(payload);

      if (!normalized) {
        console.error("❌ Failed to normalize Zid order webhook");
        errorMessage = "Failed to normalize webhook payload";
        processedOk = false;
        return NextResponse.json(
          { error: "Invalid order webhook payload" },
          { status: 400 }
        );
      }

      // Enable logging for order events
      shouldLog = true;

      const merchant = await prisma.merchant.findUnique({
        where: { zidStoreId: normalized.storeId },
      });

      if (!merchant) {
        console.error(
          `❌ Merchant not found for store_id: ${normalized.storeId}`
        );
        errorMessage = "Merchant not found";
        processedOk = false;
        return NextResponse.json(
          { error: "Merchant not found" },
          { status: 404 }
        );
      }

      merchantId = merchant.id;

      const result = await processOrderWebhook(normalized, merchant);

      processedOk = true;
      return NextResponse.json(result, { status: 200 });
    }

    // ============================================
    // UNKNOWN EVENT
    // ============================================
    console.log(`⚠️  Unhandled Zid webhook event: ${eventType}`);
    processedOk = true;
    return NextResponse.json({
      success: true,
      message: "Event received but not processed",
    });
  } catch (error) {
    console.error("❌ Zid webhook error:", error);
    errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    processedOk = false;

    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  } finally {
    // Log only for order events with normalized payload + merchantId
    if (shouldLog && normalized && merchantId) {
      try {
        await logProcessedWebhook(
          {
            idempotencyKey: normalized.idempotencyKey,
            event: normalized.event,
            orderId: normalized.orderId,
            platform: normalized.platform,
            storeId: normalized.storeId,
            merchantId: merchantId,
            processed: processedOk,
            error: errorMessage,
            rawPayload: normalized.raw,
          },
          prisma
        );
      } catch (logError) {
        console.error("Failed to log webhook:", logError);
      }
    }
  }
}
