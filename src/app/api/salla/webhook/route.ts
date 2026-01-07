import { NextRequest, NextResponse } from "next/server";
import {
  CommissionStatus,
  OrderStatus,
  Prisma,
  WebhookProcessingStatus,
  type Merchant,
} from "@prisma/client";
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toJsonValue(value: Record<string, unknown>): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function toStringOrNull(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function mapSallaStatusToOrderStatus(slug: string | null): OrderStatus {
  const normalized = slug?.toLowerCase() ?? "";
  if (normalized === "canceled" || normalized === "cancelled") return "CANCELLED";
  if (normalized === "completed" || normalized === "delivered") return "DELIVERED";
  if (normalized === "shipped") return "SHIPPED";
  if (normalized === "processing" || normalized === "in_progress") return "PROCESSING";
  return "PENDING";
}

function buildWebhookIdempotencyKey(params: {
  platform: "SALLA";
  storeId: string;
  eventType: string;
  entityId?: string | null;
  deliveryId?: string | null;
}): string {
  const parts = [
    params.platform,
    params.storeId,
    params.eventType,
    params.entityId ?? "none",
    params.deliveryId ?? "none",
  ];
  return crypto.createHash("sha256").update(parts.join("|")).digest("hex");
}

async function registerWebhookEvent(params: {
  platform: "SALLA";
  storeId: string;
  eventType: string;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  deliveryHeaderId?: string | null;
}): Promise<{ id: string | null; duplicate: boolean }> {
  try {
    const created = await prisma.webhookEvent.create({
      data: {
        platform: params.platform,
        storeId: params.storeId,
        eventType: params.eventType,
        idempotencyKey: params.idempotencyKey,
        deliveryHeaderId: params.deliveryHeaderId ?? null,
        payload: toJsonValue(params.payload),
        processingStatus: WebhookProcessingStatus.PROCESSED,
      },
      select: { id: true },
    });
    return { id: created.id, duplicate: false };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return { id: null, duplicate: true };
      }
    }
    throw error;
  }
}

async function updateWebhookEventStatus(params: {
  id: string;
  status: WebhookProcessingStatus;
  error?: string;
}): Promise<void> {
  await prisma.webhookEvent.update({
    where: { id: params.id },
    data: {
      processingStatus: params.status,
      errorMessage: params.error ?? null,
    },
  });
}

function resolveSallaStoreId(payload: Record<string, unknown>): string | null {
  const merchant = payload.merchant as Record<string, unknown> | undefined;
  const data = payload.data as Record<string, unknown> | undefined;
  const dataMerchant = isRecord(data?.merchant) ? data?.merchant : null;
  const dataStore = isRecord(data?.store) ? data?.store : null;
  const store =
    merchant?.id ??
    dataMerchant?.id ??
    dataStore?.id ??
    data?.id ??
    payload.store_id ??
    null;
  return toStringOrNull(store);
}

async function findProductIdByPayload(
  merchantId: string,
  payload: Record<string, unknown>
): Promise<string | null> {
  const data = payload.data as Record<string, unknown> | undefined;
  const items = Array.isArray(data?.items) ? data?.items : [];
  if (items.length === 0) return null;

  const first = items[0] as Record<string, unknown>;
  const productId =
    toStringOrNull(first.product_id) ??
    toStringOrNull((first.product as Record<string, unknown> | undefined)?.id) ??
    null;

  if (!productId) return null;

  const product = await prisma.product.findFirst({
    where: { merchantId, sallaProductId: productId },
    select: { id: true },
  });

  return product?.id ?? null;
}

function extractOrderQuantity(payload: Record<string, unknown>): number {
  const data = payload.data as Record<string, unknown> | undefined;
  const items = Array.isArray(data?.items) ? data?.items : [];
  if (items.length === 0) return 1;
  const total = items.reduce((sum, item) => {
    const record = item as Record<string, unknown>;
    const qty = Number(record.quantity ?? 0);
    return sum + (Number.isFinite(qty) ? qty : 0);
  }, 0);
  return total > 0 ? total : 1;
}

function extractShippingInfo(payload: Record<string, unknown>): {
  shippingAddress: Prisma.InputJsonValue | null;
  shippingCity: string | null;
} {
  const data = payload.data as Record<string, unknown> | undefined;
  const shipping =
    (isRecord(data?.shipping) ? data?.shipping : null) ??
    (isRecord(data?.shipping_address) ? data?.shipping_address : null) ??
    (isRecord(data?.address) ? data?.address : null) ??
    null;

  if (!shipping) {
    return { shippingAddress: null, shippingCity: null };
  }

  const city =
    toStringOrNull(shipping.city) ??
    toStringOrNull(shipping.city_name) ??
    toStringOrNull(shipping.town) ??
    null;

  return {
    shippingAddress: shipping as Prisma.InputJsonValue,
    shippingCity: city,
  };
}

function extractCustomerInfo(payload: Record<string, unknown>): {
  name: string | null;
  email: string | null;
  phone: string | null;
} {
  const data = payload.data as Record<string, unknown> | undefined;
  const receiver = isRecord(data?.receiver) ? data?.receiver : null;
  const customer = isRecord(data?.customer) ? data?.customer : null;

  return {
    name:
      toStringOrNull(receiver?.name) ??
      toStringOrNull(customer?.name) ??
      null,
    email:
      toStringOrNull(receiver?.email) ??
      toStringOrNull(customer?.email) ??
      null,
    phone:
      toStringOrNull(receiver?.phone) ??
      toStringOrNull(customer?.phone) ??
      null,
  };
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
  let webhookEventId: string | null = null;
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
    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    const data = payload.data as Record<string, unknown> | undefined;
    const merchantPayload = payload.merchant as Record<string, unknown> | undefined;
    const eventType = String(payload.event ?? payload.event_type ?? "")
      .trim()
      .toLowerCase();
    const deliveryHeaderId =
      request.headers.get("x-salla-delivery-id") ??
      request.headers.get("x-salla-webhook-id") ??
      null;

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
      shouldLog = true;

      const orderEvent = await registerWebhookEvent({
        platform: "SALLA",
        storeId: normalized.storeId,
        eventType,
        idempotencyKey: normalized.idempotencyKey,
        deliveryHeaderId,
        payload: {
          eventType,
          orderId: normalized.orderId,
          storeId: normalized.storeId,
        },
      });

      webhookEventId = orderEvent.id;
      if (orderEvent.duplicate) {
        debugLog("duplicate-webhook", {
          eventType,
          orderId: normalized.orderId,
        });
        processedOk = true;
        return NextResponse.json({ success: true, duplicate: true });
      }

      const orderStatus = mapSallaStatusToOrderStatus(normalized.orderStatus);
      const paymentStatus = normalized.paymentStatus;
      const payment = isRecord(data?.payment) ? data?.payment : null;
      const paymentMethod =
        toStringOrNull(payment?.method) ??
        toStringOrNull(data?.payment_method) ??
        null;
      const quantity = extractOrderQuantity(payload);
      const shipping = extractShippingInfo(payload);
      const customerInfo = extractCustomerInfo(payload);
      const productId = await findProductIdByPayload(merchant.id, payload);
      const confirmedAt =
        isPaymentConfirmed(paymentStatus, normalized.orderStatus) &&
        normalized.updatedAt
          ? normalized.updatedAt
          : null;

      const shippingData = shipping.shippingAddress
        ? {
            shippingAddress: shipping.shippingAddress,
            shippingCity: shipping.shippingCity,
          }
        : {};

      await prisma.order.upsert({
        where: { sallaOrderId: normalized.orderId },
        create: {
          merchantId: merchant.id,
          platform: "SALLA",
          sallaOrderId: normalized.orderId,
          sallaStatus: normalized.orderStatus,
          totalPrice: new Prisma.Decimal(normalized.total),
          currency: normalized.currency,
          quantity,
          productId,
          status: orderStatus,
          paymentStatus,
          paymentMethod,
          customerName: customerInfo.name,
          customerEmail: customerInfo.email,
          customerPhone: customerInfo.phone,
          ...(normalized.createdAt ? { createdAt: normalized.createdAt } : {}),
          ...(confirmedAt ? { confirmedAt } : {}),
          ...shippingData,
        },
        update: {
          merchantId: merchant.id,
          platform: "SALLA",
          sallaStatus: normalized.orderStatus,
          totalPrice: new Prisma.Decimal(normalized.total),
          currency: normalized.currency,
          quantity,
          productId,
          status: orderStatus,
          paymentStatus,
          paymentMethod,
          customerName: customerInfo.name,
          customerEmail: customerInfo.email,
          customerPhone: customerInfo.phone,
          ...(confirmedAt ? { confirmedAt } : {}),
          ...shippingData,
        },
      });

      const result = await processOrderWebhook(normalized, merchant);
      processedOk = true;
      return NextResponse.json({ ...result, orderUpserted: true });
    }

    /* --------------------------------------------------------
       PRODUCT EVENTS
    -------------------------------------------------------- */
    if (eventType === "product.created" || eventType === "product.updated") {
      const productId = data?.id;
      const storeId =
        toStringOrNull(merchantPayload?.id) ?? resolveSallaStoreId(payload);

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

      const idempotencyKey = buildWebhookIdempotencyKey({
        platform: "SALLA",
        storeId,
        eventType,
        entityId: String(productId),
        deliveryId: deliveryHeaderId,
      });

      const productEvent = await registerWebhookEvent({
        platform: "SALLA",
        storeId,
        eventType,
        idempotencyKey,
        deliveryHeaderId,
        payload: {
          eventType,
          productId: String(productId),
          storeId,
        },
      });

      webhookEventId = productEvent.id;
      if (productEvent.duplicate) {
        debugLog("duplicate-product-webhook", {
          eventType,
          productId: String(productId),
        });
        processedOk = true;
        return NextResponse.json({ success: true, duplicate: true });
      }

      await syncSallaProductById(merchant, productId.toString());
      processedOk = true;
      return NextResponse.json({ success: true });
    }

    /* --------------------------------------------------------
       APP INSTALLED
    -------------------------------------------------------- */
    if (eventType === "app.installed") {
      const storeIdString = resolveSallaStoreId(payload) ?? "";

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

    /* --------------------------------------------------------
       APP UNINSTALLED
    -------------------------------------------------------- */
    if (eventType === "app.uninstalled" || eventType === "app.uninstall") {
      const storeIdString = resolveSallaStoreId(payload) ?? "";

      if (!storeIdString) {
        console.warn("Salla app.uninstalled: missing storeId in payload");
        processedOk = true;
        return NextResponse.json({ success: true });
      }

      const idempotencyKey = buildWebhookIdempotencyKey({
        platform: "SALLA",
        storeId: storeIdString,
        eventType,
        entityId: storeIdString,
        deliveryId: deliveryHeaderId,
      });

      const uninstallEvent = await registerWebhookEvent({
        platform: "SALLA",
        storeId: storeIdString,
        eventType,
        idempotencyKey,
        deliveryHeaderId,
        payload: {
          eventType,
          storeId: storeIdString,
        },
      });

      webhookEventId = uninstallEvent.id;
      if (uninstallEvent.duplicate) {
        debugLog("duplicate-uninstall-webhook", { storeId: storeIdString });
        processedOk = true;
        return NextResponse.json({ success: true, duplicate: true });
      }

      await prisma.merchant.updateMany({
        where: { sallaStoreId: storeIdString },
        data: {
          isActive: false,
          sallaAccessToken: null,
          sallaRefreshToken: null,
          sallaTokenExpiry: null,
          autoSyncProducts: false,
        },
      });

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
    if (webhookEventId) {
      try {
        await updateWebhookEventStatus({
          id: webhookEventId,
          status: processedOk
            ? WebhookProcessingStatus.PROCESSED
            : WebhookProcessingStatus.FAILED,
          error: errorMessage,
        });
      } catch (error) {
        console.error("Failed to update webhook event status:", error);
      }
    }

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
