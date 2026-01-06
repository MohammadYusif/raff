import { NextRequest, NextResponse } from "next/server";
import { CommissionStatus, type Merchant } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSallaWebhookConfig } from "@/lib/platform/config";
import { syncSallaProductById } from "@/lib/services/salla.service";
import { syncSallaStoreInfo } from "@/lib/sync/sallaStore";
import {
  normalizeSallaOrderWebhook,
  logProcessedWebhook,
  isValidRaffReferrer,
  isPaymentConfirmed,
  isOrderCancelled,
} from "@/lib/platform/webhook-normalizer";
import crypto from "crypto";

const shouldDebug =
  process.env.RAFF_SALLA_WEBHOOK_DEBUG === "true" ||
  process.env.NODE_ENV !== "production";
const debugLog = (message: string, details?: Record<string, unknown>) => {
  if (!shouldDebug) return;
  if (details) {
    console.log("[salla-webhook]", message, details);
    return;
  }
  console.log("[salla-webhook]", message);
};

/* ============================================================
   Helpers
============================================================ */

function sha256SecretPlusBody(secret: string, rawBody: string): string {
  return crypto
    .createHash("sha256")
    .update(
      Buffer.concat([Buffer.from(secret, "utf8"), Buffer.from(rawBody, "utf8")])
    )
    .digest("hex");
}

function sha256BodyPlusSecret(secret: string, rawBody: string): string {
  return crypto
    .createHash("sha256")
    .update(
      Buffer.concat([Buffer.from(rawBody, "utf8"), Buffer.from(secret, "utf8")])
    )
    .digest("hex");
}

function hmacSha256(secret: string, rawBody: string): string {
  return crypto
    .createHmac("sha256", Buffer.from(secret, "utf8"))
    .update(rawBody, "utf8")
    .digest("hex");
}

function normalizeHexSig(sig: string): string {
  const trimmed = sig.trim();
  const parts = trimmed.split("=");
  const candidate = parts.length === 2 ? parts[1] : trimmed;
  return candidate.trim().toLowerCase();
}

function safePrefix(value: string, n = 12): string {
  const v = value ?? "";
  return v.length <= n ? v : `${v.slice(0, n)}...`;
}

/* ============================================================
   Order Processing (unchanged business logic)
============================================================ */

async function processOrderWebhook(
  normalized: NonNullable<ReturnType<typeof normalizeSallaOrderWebhook>>,
  merchant: Merchant
): Promise<{ success: boolean; message: string; commission?: number }> {
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

    await tx.commission.upsert({
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
      `Commission ${desiredStatus}: ${commissionAmount} ${normalized.currency} for order ${normalized.orderId}`
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
    debugLog("config", {
      headerName: webhookConfig.header,
      signatureMode: webhookConfig.signatureMode,
      hasSecret: Boolean(webhookConfig.secret),
      secretLength: webhookConfig.secret ? webhookConfig.secret.length : 0,
      secretTrimmedLength: webhookConfig.secret
        ? webhookConfig.secret.trim().length
        : 0,
    });

    rawBody = await request.text();

    /* --------------------------------------------------------
       HEADER + BODY DEBUG (safe)
    -------------------------------------------------------- */
    const headerName = webhookConfig.header ?? "x-salla-signature";
    const signatureRaw = request.headers.get(headerName);
    const strategyHeader = request.headers.get("x-salla-security-strategy");

    debugLog("incoming-headers", {
      signatureHeaderName: headerName.toLowerCase(),
      signaturePresent: Boolean(signatureRaw),
      signatureLength: signatureRaw ? signatureRaw.trim().length : 0,
      signaturePrefix: signatureRaw ? safePrefix(signatureRaw.trim()) : null,
      strategy: strategyHeader ?? null,
      contentType: request.headers.get("content-type"),
    });

    debugLog("raw-body", {
      rawBodyLength: rawBody.length,
      rawBodyHash: crypto.createHash("sha256").update(rawBody).digest("hex"),
    });

    /* --------------------------------------------------------
       SIGNATURE VERIFICATION (SALLA)
    -------------------------------------------------------- */
    if (!webhookConfig.secret) {
      console.error("SALLA_WEBHOOK_SECRET missing");
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 500 }
      );
    }

    if (!signatureRaw) {
      console.error("Missing Salla signature header");
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    const provided = normalizeHexSig(signatureRaw);
    const secret = webhookConfig.secret;

    const expSecretPlusBody = sha256SecretPlusBody(secret, rawBody);
    const expBodyPlusSecret = sha256BodyPlusSecret(secret, rawBody);
    const expHmac = hmacSha256(secret, rawBody);
    const matchShaSecretBody = provided === expSecretPlusBody;
    const matchShaBodySecret = provided === expBodyPlusSecret;
    const matchHmac = provided === expHmac;
    const matchPlain = signatureRaw.trim() === secret.trim();

    debugLog("signature-candidates", {
      providedPrefix: safePrefix(provided),
      providedLength: provided.length,
      sha256_secret_plus_body: safePrefix(expSecretPlusBody),
      sha256_body_plus_secret: safePrefix(expBodyPlusSecret),
      hmac_sha256: safePrefix(expHmac),
    });

    debugLog("signature-match", {
      matchShaSecretBody,
      matchShaBodySecret,
      matchHmac,
      matchPlain,
    });

    if (
      !matchShaSecretBody &&
      !matchShaBodySecret &&
      !matchHmac &&
      !matchPlain
    ) {
      console.error("Salla webhook signature verification failed");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const configuredMode = webhookConfig.signatureMode ?? "hmac-sha256";

    if (
      configuredMode === "sha256" &&
      !(matchShaSecretBody || matchShaBodySecret)
    ) {
      console.error(
        "Mode mismatch: expected sha256 but signature matched other method"
      );
      return NextResponse.json(
        { error: "Invalid signature mode" },
        { status: 401 }
      );
    }

    if (configuredMode === "hmac-sha256" && !matchHmac) {
      console.error(
        "Mode mismatch: expected hmac-sha256 but signature matched other method"
      );
      return NextResponse.json(
        { error: "Invalid signature mode" },
        { status: 401 }
      );
    }

    if (configuredMode === "plain" && !matchPlain) {
      console.error(
        "Mode mismatch: expected plain but signature matched other method"
      );
      return NextResponse.json(
        { error: "Invalid signature mode" },
        { status: 401 }
      );
    }

    /* --------------------------------------------------------
       PAYLOAD PARSE
    -------------------------------------------------------- */
    const payload = JSON.parse(rawBody);
    const eventType = String(payload.event ?? payload.event_type ?? "")
      .trim()
      .toLowerCase();

    debugLog("received-event", { eventType });

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

    /* --------------------------------------------------------
       APP INSTALLED
    -------------------------------------------------------- */
    if (eventType === "app.installed") {
      const storeId =
        payload.merchant?.id ??
        payload.data?.merchant?.id ??
        payload.data?.store?.id ??
        payload.data?.id ??
        null;
      const storeIdString = storeId ? String(storeId) : "";

      if (storeIdString) {
        const merchant = await prisma.merchant.findUnique({
          where: { sallaStoreId: storeIdString },
          select: {
            id: true,
            sallaAccessToken: true,
            sallaStoreId: true,
            updatedAt: true,
          },
        });

        if (!merchant) {
          console.warn("Salla app.installed: merchant not found for store", {
            storeId: storeIdString,
          });
          processedOk = true;
          return NextResponse.json({ success: true });
        }

        const recentWindowMs = 5 * 60 * 1000;
        const recentlySynced =
          merchant.updatedAt &&
          Date.now() - merchant.updatedAt.getTime() < recentWindowMs &&
          merchant.sallaStoreId === storeIdString;

        if (recentlySynced) {
          debugLog("app-installed-skip-recent", {
            merchantId: merchant.id,
            sallaStoreId: storeIdString,
          });
          processedOk = true;
          return NextResponse.json({ success: true, skipped: true });
        }

        if (merchant.sallaAccessToken) {
          await syncSallaStoreInfo(merchant.id);
        } else {
          console.warn("Salla app.installed: missing access token for store", {
            storeId: storeIdString,
          });
        }
      } else {
        console.warn("Salla app.installed: missing storeId in payload");
      }

      processedOk = true;
      return NextResponse.json({ success: true });
    }

    debugLog("unhandled-event", { eventType });
    processedOk = true;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Salla webhook error:", error);
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
