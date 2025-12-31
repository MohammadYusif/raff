// src/app/api/salla/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { CommissionStatus, type Merchant } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSallaWebhookConfig } from "@/lib/platform/config";
import {
  syncSallaProductById,
  deactivateSallaProduct,
} from "@/lib/services/salla.service";
import {
  normalizeSallaOrderWebhook,
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
  normalized: NonNullable<ReturnType<typeof normalizeSallaOrderWebhook>>,
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
        `📌 Found existing commission for order ${normalized.orderId}, will update status if needed`
      );
    }
  }

  if (!clickTracking) {
    // Not an error ??" could be an order not coming from Raff
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
  let normalized: ReturnType<typeof normalizeSallaOrderWebhook> | null = null;
  let merchantId: string | null = null;

  // logging control
  let processedOk = false;
  let errorMessage: string | undefined;
  let shouldLog = false;

  try {
    const webhookConfig = getSallaWebhookConfig();
    const isProd = process.env.NODE_ENV === "production";
    const skipVerification =
      !isProd && process.env.SKIP_WEBHOOK_VERIFICATION === "true";
    const canVerify = !!(webhookConfig.secret && webhookConfig.header);

    if (isProd && !skipVerification && !canVerify) {
      console.error("Salla webhook config missing in production");
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
        console.error("Salla webhook signature missing");
        errorMessage = "Missing signature";
        processedOk = false;
        return NextResponse.json({ error: "Missing signature" }, { status: 401 });
      }

      const signatureConfig: SignatureConfig = {
        mode: webhookConfig.signatureMode ?? "plain",
        secret: webhookConfig.secret!,
      };

      if (!verifySignature(signature, signatureConfig, rawBody)) {
        console.error("Salla webhook signature verification failed");
        errorMessage = "Invalid signature";
        processedOk = false;
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    } else {
      console.log("Salla webhook verification skipped");
    }

    const payload = JSON.parse(rawBody);
    const eventType = String(payload.event ?? payload.event_type ?? "")
      .trim()
      .toLowerCase();

    console.log(`📥 Salla webhook received: ${eventType}`);

    // ============================================
    // APP AUTHORIZATION (Salla-specific)
    // ============================================
    if (eventType === "app.store.authorize") {
      const storeId = payload.merchant?.id?.toString();
      const accessToken = payload.data?.access_token;
      const refreshToken = payload.data?.refresh_token;
      const expiresIn = payload.data?.expires_in;

      if (!storeId || !accessToken) {
        console.error("❌ Missing store info in app.store.authorize");
        processedOk = false;
        return NextResponse.json({ error: "Missing data" }, { status: 400 });
      }

      const tokenExpiry = expiresIn
        ? new Date(Date.now() + expiresIn * 1000)
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

      await prisma.merchant.upsert({
        where: { sallaStoreId: storeId },
        create: {
          sallaStoreId: storeId,
          name: payload.merchant?.name ?? "Salla Merchant",
          email: payload.merchant?.email ?? `merchant-${storeId}@salla.sa`,
          sallaAccessToken: accessToken,
          sallaRefreshToken: refreshToken,
          sallaTokenExpiry: tokenExpiry,
          status: "APPROVED",
        },
        update: {
          sallaAccessToken: accessToken,
          sallaRefreshToken: refreshToken,
          sallaTokenExpiry: tokenExpiry,
        },
      });

      processedOk = true;
      return NextResponse.json({
        success: true,
        message: "Merchant authorized successfully",
      });
    }

    // ============================================
    // PRODUCT EVENTS
    // ============================================
    if (
      eventType === "product.created" ||
      eventType === "product.updated" ||
      eventType === "product.published"
    ) {
      const productId = payload.data?.id;
      const storeId = payload.merchant?.id?.toString();

      if (!productId || !storeId) {
        console.error("❌ Missing product_id or merchant_id in payload");
        processedOk = false;
        return NextResponse.json({ error: "Missing data" }, { status: 400 });
      }

      const merchant = await prisma.merchant.findUnique({
        where: { sallaStoreId: storeId },
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
        process.env.SKIP_PLATFORM_SYNC === "true" ||
        !merchant.sallaAccessToken ||
        !process.env.SALLA_CLIENT_ID ||
        !process.env.SALLA_CLIENT_SECRET ||
        !process.env.SALLA_API_BASE_URL ||
        !process.env.SALLA_PRODUCT_API_URL_TEMPLATE;

      if (syncDisabled) {
        console.log("Salla product sync skipped (missing API config)");
        processedOk = true;
        return NextResponse.json({
          success: true,
          message: "Product sync skipped in development",
        });
      }

      await syncSallaProductById(merchant, productId.toString());

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
      eventType === "product.removed" ||
      eventType === "product.unpublished"
    ) {
      const productId = payload.data?.id;
      const storeId = payload.merchant?.id?.toString();

      if (!productId || !storeId) {
        console.error("❌ Missing product_id or merchant_id in delete payload");
        processedOk = false;
        return NextResponse.json({ error: "Missing data" }, { status: 400 });
      }

      const merchant = await prisma.merchant.findUnique({
        where: { sallaStoreId: storeId },
      });

      if (!merchant) {
        console.error(`❌ Merchant not found for store_id: ${storeId}`);
        processedOk = false;
        return NextResponse.json(
          { error: "Merchant not found" },
          { status: 404 }
        );
      }

      await deactivateSallaProduct(merchant.id, productId.toString());

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
      eventType === "order.updated" ||
      eventType === "order.paid" ||
      eventType === "order.status.updated"
    ) {
      normalized = normalizeSallaOrderWebhook(payload);

      if (!normalized) {
        console.error("❌ Failed to normalize Salla order webhook");
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
        where: { sallaStoreId: normalized.storeId },
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
    console.log(`⚠️  Unhandled Salla webhook event: ${eventType}`);
    processedOk = true;
    return NextResponse.json({
      success: true,
      message: "Event received but not processed",
    });
  } catch (error) {
    console.error("❌ Salla webhook error:", error);
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
