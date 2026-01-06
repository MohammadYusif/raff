import { NextRequest, NextResponse } from "next/server";
import {
  CommissionStatus,
  MerchantStatus,
  Prisma,
  type Merchant,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
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
  isOrderCancelled,
  verifySignature,
  SignatureConfig,
} from "@/lib/platform/webhook-normalizer";
import crypto from "crypto";

/* ============================================================
   Helpers
============================================================ */

function isSameAmount(value: unknown, target: number): boolean {
  const numeric =
    typeof value === "number" ? value : Number(value ?? Number.NaN);
  if (Number.isNaN(numeric)) return false;
  return Math.abs(numeric - target) < 0.0001;
}

function isSameCurrency(value: string | null | undefined, target: string) {
  return (value ?? "").toUpperCase() === target.toUpperCase();
}

/* ============================================================
   Order Processing (unchanged business logic)
============================================================ */

async function processOrderWebhook(
  normalized: NonNullable<ReturnType<typeof normalizeSallaOrderWebhook>>,
  merchant: Merchant
): Promise<{ success: boolean; message: string; commission?: number }> {
  const isDev = process.env.NODE_ENV !== "production";

  const referrerCode = normalized.referrerCode;
  if (!referrerCode || !isValidRaffReferrer(referrerCode)) {
    return { success: true, message: "No valid Raff referrer code" };
  }

  return prisma.$transaction(async (tx) => {
    const existingOrderCommission = await tx.commission.findUnique({
      where: {
        merchantId_orderId: {
          merchantId: merchant.id,
          orderId: normalized.orderId,
        },
      },
      include: { clickTracking: true },
    });

    const clickTracking =
      existingOrderCommission?.clickTracking ??
      (await tx.clickTracking.findFirst({
        where: {
          trackingId: referrerCode,
          merchantId: merchant.id,
          expiresAt: { gte: new Date() },
        },
      }));

    if (!clickTracking) {
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

    const desiredStatus: CommissionStatus = orderCancelled
      ? CommissionStatus.CANCELLED
      : paymentConfirmed
        ? CommissionStatus.APPROVED
        : CommissionStatus.PENDING;

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
        status: desiredStatus,
      },
      update: {
        orderTotal: normalized.total,
        orderCurrency: normalized.currency,
        commissionRate,
        commissionAmount,
        status: desiredStatus,
      },
    });

    console.log(
      `✅ Commission ${desiredStatus}: ${commissionAmount} ${normalized.currency} for order ${normalized.orderId}`
    );

    return {
      success: true,
      message: `Commission ${desiredStatus.toLowerCase()}`,
      commission: Number(commissionAmount),
    };
  });
}

/* ============================================================
   WEBHOOK ENTRYPOINT
============================================================ */

export async function POST(request: NextRequest) {
  let rawBody: string = "";
  let normalized: ReturnType<typeof normalizeSallaOrderWebhook> | null = null;
  let merchantId: string | null = null;
  let shouldLog = false;
  let processedOk = false;
  let errorMessage: string | undefined;

  try {
    const webhookConfig = getSallaWebhookConfig();

    /* --------------------------------------------------------
       CONFIG DEBUG (safe)
    -------------------------------------------------------- */
    console.log("🧷 Salla webhook config:", {
      header: webhookConfig.header,
      signatureMode: webhookConfig.signatureMode,
      hasSecret: Boolean(webhookConfig.secret),
    });

    rawBody = await request.text();

    /* --------------------------------------------------------
       HEADER + BODY DEBUG (safe)
    -------------------------------------------------------- */
    const signatureHeaderName = webhookConfig.header ?? "x-salla-signature";
    const signature = request.headers.get(signatureHeaderName);
    const strategyHeader =
      request.headers.get("X-Salla-Security-Strategy") ??
      request.headers.get("x-salla-security-strategy");

    console.log("🔍 Incoming headers:", {
      signatureHeaderName,
      signaturePresent: Boolean(signature),
      signaturePrefix: signature ? `${signature.slice(0, 12)}...` : null,
      signatureLength: signature?.length ?? null,
      strategy: strategyHeader ?? null,
      contentType: request.headers.get("content-type"),
    });

    console.log("📦 Raw body debug:", {
      rawBodyLength: rawBody.length,
      rawBodyHash: crypto.createHash("sha256").update(rawBody).digest("hex"),
    });

    /* --------------------------------------------------------
       SIGNATURE VERIFICATION (SALLA = SHA256)
    -------------------------------------------------------- */
    if (!webhookConfig.secret) {
      console.error("❌ SALLA_WEBHOOK_SECRET missing");
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 500 }
      );
    }

    if (!signature) {
      console.error("❌ Missing Salla signature header");
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    const signatureConfig: SignatureConfig = {
      mode: "sha256", // SALLA USES SHA256 (secret + body)
      secret: webhookConfig.secret,
    };

    const expectedSha256 = crypto
      .createHash("sha256")
      .update(webhookConfig.secret + rawBody)
      .digest("hex");

    console.log("🧪 Signature debug:", {
      mode: signatureConfig.mode,
      providedPrefix: `${signature.slice(0, 12)}...`,
      expectedPrefix: `${expectedSha256.slice(0, 12)}...`,
      providedLength: signature.length,
      expectedLength: expectedSha256.length,
    });

    if (!verifySignature(signature, signatureConfig, rawBody)) {
      console.error("❌ Salla webhook signature verification failed");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    /* --------------------------------------------------------
       PAYLOAD PARSE
    -------------------------------------------------------- */
    const payload = JSON.parse(rawBody);
    const eventType = String(payload.event ?? payload.event_type ?? "")
      .trim()
      .toLowerCase();

    console.log(`📥 Salla webhook received: ${eventType}`);

    /* --------------------------------------------------------
       ORDER EVENTS
    -------------------------------------------------------- */
    if (eventType.startsWith("order.")) {
      normalized = normalizeSallaOrderWebhook(payload);
      if (!normalized) {
        return NextResponse.json(
          { error: "Invalid order payload" },
          { status: 400 }
        );
      }

      shouldLog = true;

      const merchant = await prisma.merchant.findUnique({
        where: { sallaStoreId: normalized.storeId },
      });

      if (!merchant) {
        return NextResponse.json(
          { error: "Merchant not found" },
          { status: 404 }
        );
      }

      merchantId = merchant.id;
      const result = await processOrderWebhook(normalized, merchant);
      processedOk = true;
      return NextResponse.json(result);
    }

    /* --------------------------------------------------------
       PRODUCT EVENTS
    -------------------------------------------------------- */
    if (eventType === "product.created" || eventType === "product.updated") {
      const productId = payload.data?.id;
      const storeId = payload.merchant?.id?.toString();

      if (!productId || !storeId) {
        return NextResponse.json({ error: "Missing data" }, { status: 400 });
      }

      const merchant = await prisma.merchant.findUnique({
        where: { sallaStoreId: storeId },
      });

      if (!merchant) {
        return NextResponse.json(
          { error: "Merchant not found" },
          { status: 404 }
        );
      }

      await syncSallaProductById(merchant, productId.toString());
      processedOk = true;
      return NextResponse.json({ success: true });
    }

    console.log("⚠️ Unhandled Salla webhook event:", eventType);
    processedOk = true;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Salla webhook error:", error);
    errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  } finally {
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
            merchantId,
            processed: processedOk,
            error: errorMessage,
            rawPayload: rawBody,
          },
          prisma
        );
      } catch (e) {
        console.error("Failed to log webhook:", e);
      }
    }
  }
}
