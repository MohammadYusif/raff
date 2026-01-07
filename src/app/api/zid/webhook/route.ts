// src/app/api/zid/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { CommissionStatus, Prisma, type Merchant } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getZidWebhookConfig } from "@/lib/platform/config";
import { deactivateZidProduct } from "@/lib/services/zid.service";
import { syncZidProductById } from "@/lib/sync/zidProducts";
import {
  normalizeZidOrderWebhook,
  logProcessedWebhook,
  isValidRaffReferrer,
  isPaymentConfirmed,
  isOrderCancelled,
  verifySignature,
  SignatureConfig,
} from "@/lib/platform/webhook-normalizer";

function isSameAmount(value: unknown, target: number): boolean {
  const numeric =
    typeof value === "number" ? value : Number(value ?? Number.NaN);
  if (Number.isNaN(numeric)) return false;
  return Math.abs(numeric - target) < 0.0001;
}

function isSameCurrency(value: string | null | undefined, target: string) {
  return (value ?? "").toUpperCase() === target.toUpperCase();
}

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
  const referrerCode = normalized.referrerCode;
  if (!referrerCode || !isValidRaffReferrer(referrerCode)) {
    return { success: true, message: "No valid Raff referrer code" };
  }

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

  return prisma.$transaction(async (tx) => {
    const existingOrderCommission = await tx.commission.findUnique({
      where: {
        merchantId_orderId: {
          merchantId: merchant.id,
          orderId: normalized.orderId,
        },
      },
      select: {
        id: true,
        status: true,
        orderTotal: true,
        orderCurrency: true,
        commissionRate: true,
        commissionAmount: true,
        clickTracking: {
          select: {
            id: true,
            trackingId: true,
            commissionRate: true,
            conversionValue: true,
            commissionValue: true,
            converted: true,
            convertedAt: true,
            convertedCount: true,
            lastConvertedAt: true,
          },
        },
      },
    });

    let clickTracking = existingOrderCommission?.clickTracking ?? null;

    if (!clickTracking) {
      clickTracking = await tx.clickTracking.findFirst({
        where: {
          trackingId: referrerCode,
          merchantId: merchant.id,
          expiresAt: { gte: new Date() },
        },
        select: {
          id: true,
          trackingId: true,
          commissionRate: true,
          conversionValue: true,
          commissionValue: true,
          converted: true,
          convertedAt: true,
          convertedCount: true,
          lastConvertedAt: true,
        },
      });
    }

    if (!clickTracking) {
      // Not an error: could be an order not coming from Raff.
      return { success: true, message: "No matching click tracking found" };
    }

    const paymentConfirmed = isPaymentConfirmed(
      normalized.paymentStatus,
      normalized.orderStatus
    );
    const orderCancelled = isOrderCancelled(
      normalized.paymentStatus,
      normalized.orderStatus
    );

    const commissionRate = Number(
      clickTracking.commissionRate ?? merchant.commissionRate
    );
    const commissionAmount = (normalized.total * commissionRate) / 100;

    const mergeStatus = (
      current: CommissionStatus | null | undefined,
      next: CommissionStatus
    ): CommissionStatus => {
      if (next === CommissionStatus.CANCELLED) {
        return CommissionStatus.CANCELLED;
      }
      if (current === CommissionStatus.PAID) return CommissionStatus.PAID;
      if (current === CommissionStatus.APPROVED) {
        return CommissionStatus.APPROVED;
      }
      // Cancellation is terminal by policy.
      if (current === CommissionStatus.CANCELLED) {
        return CommissionStatus.CANCELLED;
      }
      return next;
    };

    const desiredStatus: CommissionStatus = orderCancelled
      ? CommissionStatus.CANCELLED
      : paymentConfirmed
        ? CommissionStatus.APPROVED
        : CommissionStatus.PENDING;

    const status = mergeStatus(
      existingOrderCommission?.status ?? null,
      desiredStatus
    );

    if (
      existingOrderCommission &&
      status === existingOrderCommission.status &&
      isSameAmount(existingOrderCommission.orderTotal, normalized.total) &&
      isSameCurrency(existingOrderCommission.orderCurrency, normalized.currency) &&
      isSameAmount(existingOrderCommission.commissionRate, commissionRate) &&
      isSameAmount(existingOrderCommission.commissionAmount, commissionAmount)
    ) {
      return {
        success: true,
        message: "Commission unchanged",
        commission: Number(commissionAmount),
      };
    }

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
      const recentOrders = await tx.commission.count({
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

    const shouldIncrementTotals =
      paymentConfirmed &&
      status === CommissionStatus.APPROVED &&
      existingOrderCommission?.status !== CommissionStatus.APPROVED;

    const shouldDecrementTotals =
      existingOrderCommission?.status === CommissionStatus.APPROVED &&
      status === CommissionStatus.CANCELLED;

    if (shouldIncrementTotals || shouldDecrementTotals) {
      const currentCount = Number(
        clickTracking.convertedCount ??
          (clickTracking.converted ? 1 : 0)
      );
      const currentConversionValue = Number(clickTracking.conversionValue ?? 0);
      const currentCommissionValue = Number(clickTracking.commissionValue ?? 0);

      let nextCount = currentCount;
      let nextConversionValue = currentConversionValue;
      let nextCommissionValue = currentCommissionValue;
      let nextConvertedAt: Date | null = clickTracking.convertedAt ?? null;
      let nextLastConvertedAt: Date | null =
        clickTracking.lastConvertedAt ?? null;
      let convertedFlag = clickTracking.converted;

      if (shouldIncrementTotals) {
        nextCount = currentCount + 1;
        nextConversionValue = currentConversionValue + normalized.total;
        nextCommissionValue = currentCommissionValue + commissionAmount;
        convertedFlag = true;
        nextConvertedAt = clickTracking.convertedAt ?? new Date();
        nextLastConvertedAt = new Date();
      } else if (shouldDecrementTotals) {
        const reversalOrderTotal = Number(
          existingOrderCommission?.orderTotal ?? normalized.total
        );
        const reversalCommission = Number(
          existingOrderCommission?.commissionAmount ?? commissionAmount
        );
        nextCount = Math.max(0, currentCount - 1);
        nextConversionValue = Math.max(
          0,
          currentConversionValue - reversalOrderTotal
        );
        nextCommissionValue = Math.max(
          0,
          currentCommissionValue - reversalCommission
        );
        convertedFlag = nextCount > 0;
        nextConvertedAt = convertedFlag
          ? clickTracking.convertedAt ?? new Date()
          : null;
        if (!convertedFlag) {
          nextLastConvertedAt = null;
        }
      }

      await tx.clickTracking.update({
        where: { id: clickTracking.id },
        data: {
          converted: convertedFlag,
          convertedCount: nextCount,
          conversionValue: new Prisma.Decimal(nextConversionValue),
          commissionValue: new Prisma.Decimal(nextCommissionValue),
          commissionRate,
          convertedAt: nextConvertedAt,
          lastConvertedAt: nextLastConvertedAt,
        },
      });
    }

    const commission = await tx.commission.upsert({
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
        commissionRate,
        commissionAmount,
        status,
      },
      update: {
        orderTotal: normalized.total,
        orderCurrency: normalized.currency,
        commissionRate,
        commissionAmount,
        status,
      },
    });

    if (riskEnabled && fraudSignals.length && riskScore >= riskThreshold) {
      for (const signal of fraudSignals) {
        const existingSignal = await tx.fraudSignal.findFirst({
          where: {
            commissionId: commission.id,
            signalType: signal.signalType,
          },
        });

        if (!existingSignal) {
          await tx.fraudSignal.create({
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
      `? Commission ${status}: ${commissionAmount} ${normalized.currency} for order ${normalized.orderId}`
    );

    return {
      success: true,
      message: `Commission ${status.toLowerCase()}`,
      commission: Number(commissionAmount),
    };
  });
}

export async function POST(request: NextRequest) {
  let normalized: ReturnType<typeof normalizeZidOrderWebhook> | null = null;
  let merchantId: string | null = null;
  let rawBody: string | null = null;

  // logging control
  let processedOk = false;
  let errorMessage: string | undefined;
  let shouldLog = false;

  try {
    const webhookConfig = getZidWebhookConfig();
    const isProd = process.env.NODE_ENV === "production";
    if (isProd && process.env.SKIP_WEBHOOK_VERIFICATION === "true") {
      console.error("SKIP_WEBHOOK_VERIFICATION is not allowed in production");
      errorMessage = "Webhook verification misconfigured";
      processedOk = false;
      return NextResponse.json(
        { error: "Webhook verification misconfigured" },
        { status: 500 }
      );
    }
    const skipVerification =
      !isProd && process.env.SKIP_WEBHOOK_VERIFICATION === "true";
    const canVerify = !!(webhookConfig.secret && webhookConfig.header);
    const zidWebhookToken = process.env.ZID_WEBHOOK_TOKEN;
    const tokenFromQuery = request.nextUrl.searchParams.get("token");

    if (isProd && !skipVerification && !canVerify && !zidWebhookToken) {
      console.error("Zid webhook config missing in production");
      errorMessage = "Webhook not configured";
      processedOk = false;
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 500 }
      );
    }

    rawBody = await request.text();

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
    } else if (isProd && !skipVerification) {
      if (!zidWebhookToken || tokenFromQuery !== zidWebhookToken) {
        console.error("Zid webhook token verification failed");
        errorMessage = "Invalid token";
        processedOk = false;
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
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
      eventType === "product.update" ||
      eventType === "product.publish"
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

      const skipSyncInDev =
        !isProd && process.env.SKIP_PLATFORM_SYNC === "true";
      const missingConfig =
        !merchant.zidAccessToken ||
        !merchant.zidManagerToken ||
        !merchant.zidStoreId ||
        !process.env.ZID_CLIENT_ID ||
        !process.env.ZID_CLIENT_SECRET ||
        !process.env.ZID_API_BASE_URL;

      if (skipSyncInDev || (!isProd && missingConfig)) {
        console.log("Zid product sync skipped in development");
        processedOk = true;
        return NextResponse.json({
          success: true,
          message: "Product sync skipped in development",
        });
      }

      if (missingConfig) {
        console.error("Zid product sync missing API config in production");
        processedOk = false;
        return NextResponse.json(
          { error: "Product sync not configured" },
          { status: 500 }
        );
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
      eventType === "order.status.update" ||
      eventType === "order.cancelled" ||
      eventType === "order.canceled" ||
      eventType === "order.refunded" ||
      eventType === "order.voided"
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
            orderKey: normalized.orderKey,
            platform: normalized.platform,
            storeId: normalized.storeId,
            merchantId: merchantId,
            processed: processedOk,
            error: errorMessage,
            rawPayload: rawBody ?? normalized.raw,
          },
          prisma
        );
      } catch (logError) {
        console.error("Failed to log webhook:", logError);
      }
    }
  }
}

