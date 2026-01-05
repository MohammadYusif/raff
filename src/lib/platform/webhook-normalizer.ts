// src/lib/platform/webhook-normalizer.ts
import crypto from "crypto";
import type { PrismaClient } from "@prisma/client";

/**
 * Normalized webhook payload structure
 */
export interface NormalizedOrderWebhook {
  event: string;
  orderId: string;
  storeId: string;
  platform: "ZID" | "SALLA";
  orderKey: string;
  total: number;
  currency: string;
  referrerCode: string | null;
  paymentStatus: string | null;
  orderStatus: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  idempotencyKey: string;
  raw: Record<string, unknown>;
}

/**
 * Robust status matching sets
 */
const PAID_PAYMENT_STATUSES = new Set([
  "paid",
  "completed",
  "success",
  "successful",
  "confirmed",
  "approved",
]);

const DELIVERED_ORDER_STATUSES = new Set([
  "delivered",
  "completed",
  "complete",
  "fulfilled",
]);

const CANCELLED_PAYMENT_STATUSES = new Set([
  "refunded",
  "refund",
  "voided",
  "void",
  "canceled",
  "cancelled",
  "cancel",
]);

const CANCELLED_ORDER_STATUSES = new Set([
  "refunded",
  "refund",
  "voided",
  "void",
  "canceled",
  "cancelled",
  "cancel",
  "rejected",
]);

/**
 * Normalize status string (trim + lowercase)
 */
function normalizeStatus(status: unknown): string | null {
  if (typeof status !== "string") return null;
  const trimmed = status.trim();
  return trimmed ? trimmed.toLowerCase() : null;
}

/**
 * Normalize event string
 */
function normalizeEvent(eventRaw: unknown): string {
  return String(eventRaw ?? "unknown")
    .trim()
    .toLowerCase();
}

/**
 * Check if payment is confirmed
 */
export function isPaymentConfirmed(
  paymentStatus: string | null,
  orderStatus: string | null
): boolean {
  const normalizedPayment = normalizeStatus(paymentStatus);
  const normalizedOrder = normalizeStatus(orderStatus);

  const paymentPaid = normalizedPayment
    ? PAID_PAYMENT_STATUSES.has(normalizedPayment)
    : false;
  const orderDelivered = normalizedOrder
    ? DELIVERED_ORDER_STATUSES.has(normalizedOrder)
    : false;

  return paymentPaid || orderDelivered;
}

export function isOrderCancelled(
  paymentStatus: string | null,
  orderStatus: string | null
): boolean {
  const normalizedPayment = normalizeStatus(paymentStatus);
  const normalizedOrder = normalizeStatus(orderStatus);

  const paymentCancelled = normalizedPayment
    ? CANCELLED_PAYMENT_STATUSES.has(normalizedPayment)
    : false;
  const orderCancelled = normalizedOrder
    ? CANCELLED_ORDER_STATUSES.has(normalizedOrder)
    : false;

  return paymentCancelled || orderCancelled;
}

/**
 * Safely parse number from string or number
 */
function parseNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

/**
 * Safely parse date
 */
function parseDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }
  try {
    const date = new Date(String(value));
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

function toNullableString(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number") return value.toString();
  return null;
}

/**
 * Check if referrer code is valid Raff tracking code
 */
export function isValidRaffReferrer(referrerCode: string | null): boolean {
  if (!referrerCode) return false;
  const validPatterns = [/^raff_/i, /^raff:/i, /^click_/i];
  return validPatterns.some((pattern) => pattern.test(referrerCode));
}

/**
 * Improved redaction helper with error handling
 */
export function redactSensitiveFields(
  payload: Record<string, unknown>
): Record<string, unknown> | null {
  try {
    // Deep clone to avoid mutating original
    const sanitized = JSON.parse(JSON.stringify(payload)) as Record<
      string,
      unknown
    >;

    // Define sensitive field paths to remove
    const sensitiveFields: Array<Array<string>> = [
      ["customer"],
      ["consignee"],
      ["data", "customer"],
      ["data", "consignee"],
      ["order", "customer"],
      ["order", "consignee"],
      ["customer", "email"],
      ["customer", "mobile"],
      ["customer", "phone"],
      ["data", "customer", "email"],
      ["data", "customer", "mobile"],
      ["data", "customer", "phone"],
    ];

    for (const path of sensitiveFields) {
      let current: Record<string, unknown> | undefined = sanitized;
      for (let i = 0; i < path.length - 1; i++) {
        if (!current?.[path[i]]) break;
        current = current[path[i]] as Record<string, unknown> | undefined;
      }
      if (current && path.length > 0) {
        delete current[path[path.length - 1]];
      }
    }

    return sanitized;
  } catch (error) {
    console.error("Failed to redact sensitive fields:", error);
    return null;
  }
}

/**
 * Generate stable order key from webhook data
 */
function generateOrderKey(params: {
  platform: string;
  orderId: string;
  storeId: string;
}): string {
  return crypto
    .createHash("sha256")
    .update(`${params.platform}:${params.storeId}:${params.orderId}`)
    .digest("hex");
}

/**
 * Generate delivery/event key from webhook data
 */
function generateEventKey(params: {
  platform: string;
  webhookId?: string | null;
  event: string;
  orderId: string;
  storeId: string;
  paymentStatus?: string | null;
  orderStatus?: string | null;
}): string {
  // If webhook provides its own ID, use that with platform prefix
  if (params.webhookId) {
    return crypto
      .createHash("sha256")
      .update(`${params.platform}:webhook:${params.webhookId}`)
      .digest("hex");
  }

  // Otherwise, create deterministic key from order data
  const parts = [
    params.platform,
    params.storeId,
    params.event,
    params.orderId,
    normalizeStatus(params.paymentStatus) ?? "unknown",
    normalizeStatus(params.orderStatus) ?? "unknown",
  ];

  return crypto.createHash("sha256").update(parts.join("|")).digest("hex");
}

/**
 * Normalize Zid order webhook payload
 */
export function normalizeZidOrderWebhook(
  payload: Record<string, unknown>
): NormalizedOrderWebhook | null {
  const data = payload.data as Record<string, unknown> | undefined;
  const order = payload.order as Record<string, unknown> | undefined;
  const store = payload.store as Record<string, unknown> | undefined;
  const dataStore = data?.store as Record<string, unknown> | undefined;
  const dataAmounts = data?.amounts as Record<string, unknown> | undefined;
  const dataOrderStatus = data?.order_status as
    | Record<string, unknown>
    | undefined;
  const event = normalizeEvent(
    payload.event ?? payload.event_type ?? payload.type
  );

  const webhookId = toNullableString(
    payload.webhook_id ?? payload.id ?? data?.webhook_id ?? null
  );

  const orderId =
    payload.order_id ?? data?.id ?? data?.order_id ?? order?.id ?? null;

  const storeId =
    payload.store_id ?? data?.store_id ?? store?.id ?? dataStore?.id ?? null;

  const orderIdValue = toNullableString(orderId);
  const storeIdValue = toNullableString(storeId);

  if (!orderIdValue || !storeIdValue) {
    console.warn("Missing required fields in Zid webhook", {
      hasOrderId: !!orderIdValue,
      hasStoreId: !!storeIdValue,
      payloadKeys: Object.keys(payload),
      dataKeys: data ? Object.keys(data) : [],
    });
    return null;
  }

  const totalRaw =
    payload.total ??
    payload.order_total ??
    data?.total ??
    data?.order_total ??
    dataAmounts?.total ??
    order?.total ??
    0;

  const total = parseNumber(totalRaw, 0);

  // Warn if total was defaulted and field wasn't actually 0
  if (total === 0 && totalRaw !== 0) {
    console.warn("Order total defaulted to 0, might be missing", {
      storeId: storeIdValue,
      orderId: orderIdValue,
      totalRaw,
      payloadKeys: Object.keys(payload),
    });
  }

  const rawCurrency =
    payload.currency ??
    payload.currency_code ??
    data?.currency_code ??
    data?.currency;
  const currencyValue = toNullableString(rawCurrency);
  const currency = currencyValue ?? "SAR";

  if (!currencyValue) {
    console.warn("Currency missing from webhook, defaulting to SAR", {
      storeId: storeIdValue,
      orderId: orderIdValue,
      payloadKeys: Object.keys(payload),
    });
  }

  const referrerCode = toNullableString(
    payload.referer_code ??
      payload.referrer_code ??
      data?.referer_code ??
      data?.referrer_code ??
      order?.referer_code ??
      null
  );

  const paymentStatus = toNullableString(
    payload.payment_status ??
      data?.payment_status ??
      order?.payment_status ??
      null
  );

  const orderStatus = toNullableString(
    payload.status ??
      payload.order_status ??
      data?.status ??
      dataOrderStatus?.code ??
      order?.status ??
      null
  );

  const createdAt = parseDate(
    payload.created_at ??
      payload.issue_date ??
      data?.created_at ??
      data?.issue_date
  );

  const updatedAt = parseDate(payload.updated_at ?? data?.updated_at ?? null);

  const orderKey = generateOrderKey({
    platform: "zid",
    orderId: orderIdValue,
    storeId: storeIdValue,
  });

  const idempotencyKey = generateEventKey({
    platform: "zid",
    webhookId,
    event,
    orderId: orderIdValue,
    storeId: storeIdValue,
    paymentStatus,
    orderStatus,
  });

  return {
    event,
    orderId: orderIdValue,
    storeId: storeIdValue,
    platform: "ZID",
    orderKey,
    total,
    currency,
    referrerCode,
    paymentStatus,
    orderStatus,
    createdAt,
    updatedAt,
    idempotencyKey,
    raw: payload,
  };
}

/**
 * Normalize Salla order webhook payload
 */
export function normalizeSallaOrderWebhook(
  payload: Record<string, unknown>
): NormalizedOrderWebhook | null {
  const data = payload.data as Record<string, unknown> | undefined;
  const order = payload.order as Record<string, unknown> | undefined;
  const merchant = payload.merchant as Record<string, unknown> | undefined;
  const dataMerchant = data?.merchant as Record<string, unknown> | undefined;
  const dataTotal = data?.total as Record<string, unknown> | undefined;
  const dataAmounts = data?.amounts as Record<string, unknown> | undefined;
  const dataStatus = data?.status as Record<string, unknown> | undefined;
  const dataPayment = data?.payment as Record<string, unknown> | undefined;
  const dataDate = data?.date as Record<string, unknown> | undefined;
  const event = normalizeEvent(
    payload.event ?? payload.event_type ?? payload.type
  );

  const webhookId = toNullableString(
    payload.webhook_id ?? payload.id ?? data?.webhook_id ?? null
  );

  const orderId = data?.id ?? order?.id ?? null;

  const storeId = merchant?.id ?? dataMerchant?.id ?? payload.store_id ?? null;

  const orderIdValue = toNullableString(orderId);
  const storeIdValue = toNullableString(storeId);

  if (!orderIdValue || !storeIdValue) {
    console.warn("Missing required fields in Salla webhook", {
      hasOrderId: !!orderIdValue,
      hasStoreId: !!storeIdValue,
      payloadKeys: Object.keys(payload),
      dataKeys: data ? Object.keys(data) : [],
    });
    return null;
  }

  const totalRaw = dataTotal?.amount ?? dataAmounts?.total ?? data?.total ?? 0;

  const total = parseNumber(totalRaw, 0);

  if (total === 0 && totalRaw !== 0) {
    console.warn("Order total defaulted to 0, might be missing", {
      storeId: storeIdValue,
      orderId: orderIdValue,
      totalRaw,
      payloadKeys: Object.keys(payload),
    });
  }

  const rawCurrency =
    dataTotal?.currency ?? data?.currency ?? data?.currency_code;
  const currencyValue = toNullableString(rawCurrency);
  const currency = currencyValue ?? "SAR";

  if (!currencyValue) {
    console.warn("Currency missing from Salla webhook, defaulting to SAR", {
      storeId: storeIdValue,
      orderId: orderIdValue,
      payloadKeys: Object.keys(payload),
    });
  }

  const referrerCode = toNullableString(
    data?.referrer ?? data?.source ?? data?.referer_code ?? null
  );

  const paymentStatus = toNullableString(
    dataPayment?.status ?? data?.payment_status ?? null
  );

  const orderStatus = toNullableString(
    dataStatus?.code ?? data?.status ?? null
  );

  const createdAt = parseDate(data?.created_at ?? dataDate?.created);
  const updatedAt = parseDate(data?.updated_at ?? dataDate?.updated);

  const orderKey = generateOrderKey({
    platform: "salla",
    orderId: orderIdValue,
    storeId: storeIdValue,
  });

  const idempotencyKey = generateEventKey({
    platform: "salla",
    webhookId,
    event,
    orderId: orderIdValue,
    storeId: storeIdValue,
    paymentStatus,
    orderStatus,
  });

  return {
    event,
    orderId: orderIdValue,
    storeId: storeIdValue,
    platform: "SALLA",
    orderKey,
    total,
    currency,
    referrerCode,
    paymentStatus,
    orderStatus,
    createdAt,
    updatedAt,
    idempotencyKey,
    raw: payload,
  };
}

/**
 * Check if webhook has already been processed (idempotency)
 * Keep this for diagnostics; business logic should still be safe via upserts/uniques.
 */
export async function isWebhookProcessed(
  idempotencyKey: string,
  prisma: PrismaClient
): Promise<boolean> {
  const existing = await prisma.webhookLog.findUnique({
    where: { idempotencyKey },
  });

  return !!existing;
}

/**
 * Log processed webhook for idempotency (idempotent upsert)
 * Includes platform and storeId (per your migrated schema)
 */
export async function logProcessedWebhook(
  data: {
    idempotencyKey: string;
    event: string;
    orderId: string;
    orderKey: string;
    platform: "ZID" | "SALLA";
    storeId: string;
    merchantId: string;
    processed: boolean;
    error?: string;
    rawPayload?: Record<string, unknown> | string;
  },
  prisma: PrismaClient
): Promise<void> {
  let sanitizedPayload: string | null = null;

  if (typeof data.rawPayload === "string") {
    sanitizedPayload = data.rawPayload;
  } else if (data.rawPayload) {
    const sanitized = redactSensitiveFields(data.rawPayload);
    if (sanitized) {
      try {
        sanitizedPayload = JSON.stringify(sanitized);
      } catch (error) {
        console.error("Failed to stringify sanitized payload:", error);
      }
    }
  }

  await prisma.webhookLog.upsert({
    where: { idempotencyKey: data.idempotencyKey },
    create: {
      idempotencyKey: data.idempotencyKey,
      event: data.event,
      orderId: data.orderId,
      orderKey: data.orderKey,
      platform: data.platform,
      storeId: data.storeId,
      merchantId: data.merchantId,
      processed: data.processed,
      error: data.error ?? null,
      payload: sanitizedPayload ? JSON.parse(sanitizedPayload) : undefined,
      processedAt: new Date(),
    },
    update: {
      processed: data.processed,
      error: data.error ?? null,
      orderKey: data.orderKey,
      processedAt: new Date(),
    },
  });
}

/**
 * Config-driven signature verification
 */
export interface SignatureConfig {
  mode: "plain" | "sha256" | "hmac-sha256";
  secret: string;
}

function normalizeSignatureHeader(
  signature: string,
  mode: SignatureConfig["mode"]
): string {
  const trimmed = signature.trim();
  if (mode === "plain") {
    return trimmed;
  }

  const normalized = trimmed.toLowerCase();
  return normalized.startsWith("sha256=")
    ? normalized.slice("sha256=".length)
    : normalized;
}

export function verifySignature(
  signature: string,
  config: SignatureConfig,
  rawBody: string
): boolean {
  const provided = normalizeSignatureHeader(signature, config.mode);
  const rawBuffer = Buffer.from(rawBody, "utf8");
  const secretBuffer = Buffer.from(config.secret, "utf8");

  if (config.mode === "plain") {
    return timingSafeEqual(provided, config.secret.trim());
  }

  if (config.mode === "sha256") {
    const expectedHex = crypto
      .createHash("sha256")
      .update(Buffer.concat([secretBuffer, rawBuffer]))
      .digest("hex");

    return timingSafeEqualHex(provided, expectedHex);
  }

  if (config.mode === "hmac-sha256") {
    const expectedHex = crypto
      .createHmac("sha256", secretBuffer)
      .update(rawBuffer)
      .digest("hex");

    return timingSafeEqualHex(provided, expectedHex);
  }

  return false;
}

function timingSafeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a, "utf8");
  const bBuffer = Buffer.from(b, "utf8");

  if (aBuffer.length !== bBuffer.length) return false;
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function timingSafeEqualHex(aHex: string, bHex: string): boolean {
  const aBuffer = hexToBuffer(aHex);
  const bBuffer = hexToBuffer(bHex);
  if (!aBuffer || !bBuffer) return false;
  if (aBuffer.length !== bBuffer.length) return false;
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function hexToBuffer(hex: string): Buffer | null {
  if (!hex || hex.length % 2 !== 0) {
    return null;
  }
  if (!/^[0-9a-f]+$/i.test(hex)) {
    return null;
  }
  return Buffer.from(hex, "hex");
}
