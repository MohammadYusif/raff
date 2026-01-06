// src/app/api/webhooks/salla/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import crypto from "crypto";
import { notifyOrderCreated } from "@/lib/services/notification.service";
import { Prisma } from "@prisma/client";

// Salla webhook events
interface SallaWebhookPayload {
  event: string;
  merchant: string;
  created_at: number;
  data: {
    id?: number | string;
    order?: {
      id: number;
      status: {
        id: number;
        name: string;
      };
      amounts: {
        total: {
          amount: number;
          currency: string;
        };
      };
      items: Array<{
        id: number;
        product: {
          id: number;
          name: string;
        };
        quantity: number;
        price: {
          amount: number;
        };
      }>;
      customer: {
        id: number;
        name: string;
        email: string;
      };
      date: {
        date: string;
      };
    };
    product?: {
      id: number;
      name: string;
      status: string;
      price: number;
    };
  };
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function getStringField(obj: unknown, key: string): string | undefined {
  if (!isRecord(obj)) return undefined;
  const value = obj[key];
  return typeof value === "string" ? value : undefined;
}

function isPrismaKnownRequestError(error: unknown): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  );
}

// Verify Salla webhook signature
function verifySallaSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payload);
  const digest = hmac.digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const signature = headersList.get("x-salla-signature");
    const deliveryId =
      headersList.get("x-salla-event-id") || headersList.get("x-webhook-id");
    const webhookSecret = process.env.SALLA_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("SALLA_WEBHOOK_SECRET not configured");
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 500 }
      );
    }

    const rawBody = await request.text();

    // Verify signature BEFORE any processing
    const isProd = process.env.NODE_ENV === "production";
    const allowUnsigned = process.env.WEBHOOK_ALLOW_UNSIGNED === "true";

    if (isProd && allowUnsigned) {
      console.error("WEBHOOK_ALLOW_UNSIGNED is not allowed in production");
      return NextResponse.json(
        { error: "Webhook security misconfigured" },
        { status: 500 }
      );
    }

    if (!signature) {
      if (isProd || !allowUnsigned) {
        console.error("Salla webhook missing signature");
        return NextResponse.json(
          { error: "Missing signature" },
          { status: 401 }
        );
      }
      console.warn("Salla webhook missing signature - allowed in dev mode");
    } else if (!verifySallaSignature(rawBody, signature, webhookSecret)) {
      console.error("Invalid Salla webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload: SallaWebhookPayload = JSON.parse(rawBody);

    // Normalize event type (defensive against provider field name changes)
    const eventType = String(
      payload.event ||
        getStringField(payload, "event_type") ||
        getStringField(payload, "type") ||
        "unknown"
    );

    if (eventType === "unknown") {
      console.error("Salla webhook missing event type field");
      return NextResponse.json({
        success: false,
        reason: "missing_event_type",
      });
    }

    // Extract merchant ID from payload (required for deduplication)
    // Always convert to string for consistent DB storage
    const rawMerchantId = payload.merchant;

    if (!rawMerchantId) {
      console.error(
        "Salla webhook missing merchant ID in payload - cannot process",
        {
          event: eventType,
          hasData: !!payload.data,
        }
      );
      // Return 200 to prevent retry storms for malformed webhooks
      return NextResponse.json({
        success: false,
        reason: "missing_merchant_id",
      });
    }

    const storeId = String(rawMerchantId);

    // Idempotency key: Use delivery header ID if available, otherwise hash of payload
    const contentHash =
      deliveryId || crypto.createHash("sha256").update(rawBody).digest("hex");
    const idempotencyKey = `${eventType}:${contentHash}`;

    // Log when delivery header is missing
    if (!deliveryId) {
      console.warn(
        `Salla webhook missing delivery header ID, using content hash for event: ${eventType}`
      );
    }

    // Atomic insert with unique constraint - handles race conditions
    try {
      await prisma.webhookEvent.create({
        data: {
          platform: "SALLA",
          storeId,
          eventType,
          idempotencyKey,
          deliveryHeaderId: deliveryId,
          payload: payload as unknown as Prisma.InputJsonValue,
          processingStatus: "PROCESSED",
        },
      });
    } catch (error: unknown) {
      // P2002 = Unique constraint violation (duplicate)
      if (isPrismaKnownRequestError(error) && error.code === "P2002") {
        console.log(`Duplicate Salla webhook ignored: ${idempotencyKey}`);
        return NextResponse.json({ success: true, duplicate: true });
      }
      throw error;
    }

    // Handle different webhook events
    try {
      switch (eventType) {
        case "order.created":
        case "order.updated":
        case "order.status.updated":
          await handleOrderEvent(payload);
          break;

        case "product.created":
        case "product.updated":
          await handleProductEvent(payload);
          break;

        default:
          console.log(`Unhandled Salla webhook event: ${payload.event}`);
      }
    } catch (processingError) {
      // Update webhook event status to FAILED using composite unique constraint
      await prisma.webhookEvent.updateMany({
        where: {
          platform: "SALLA",
          storeId,
          idempotencyKey,
        },
        data: {
          processingStatus: "FAILED",
          errorMessage:
            processingError instanceof Error
              ? processingError.message
              : "Unknown error",
        },
      });
      throw processingError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing Salla webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handleOrderEvent(payload: SallaWebhookPayload) {
  const order = payload.data.order;

  if (!order) {
    console.log("No order data in webhook payload");
    return;
  }

  // Find merchant by Salla merchant ID
  const merchant = await prisma.merchant.findFirst({
    where: {
      sallaStoreId: payload.merchant,
    },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!merchant) {
    console.log(`Merchant not found for Salla store: ${payload.merchant}`);
    return;
  }

  const sallaOrderId = order.id.toString();
  const sallaStatus = order.status.name.toLowerCase();

  const savedOrder = await prisma.order.upsert({
    where: {
      sallaOrderId,
    },
    create: {
      merchantId: merchant.id,
      sallaOrderId,
      platform: "SALLA",
      sallaStatus,
      totalPrice: order.amounts.total.amount,
      currency: order.amounts.total.currency || "SAR",
      customerName: order.customer.name,
      customerEmail: order.customer.email,
      createdAt: new Date(order.date.date),
    },
    update: {
      sallaStatus,
      totalPrice: order.amounts.total.amount,
    },
  });

  // Send notification if this is a new order and merchant has userId
  if (merchant.userId && payload.event === "order.created") {
    await notifyOrderCreated(
      merchant.userId,
      savedOrder.id,
      order.amounts.total.amount,
      order.amounts.total.currency || "SAR"
    ).catch((err) => console.error("Failed to send notification:", err));
  }

  console.log(`Processed Salla order: ${sallaOrderId}`);
}

async function handleProductEvent(payload: SallaWebhookPayload) {
  const product = payload.data.product;

  if (!product) {
    console.log("No product data in webhook payload");
    return;
  }

  // Find merchant by Salla merchant ID
  const merchant = await prisma.merchant.findFirst({
    where: {
      sallaStoreId: payload.merchant,
    },
    select: {
      id: true,
    },
  });

  if (!merchant) {
    console.log(`Merchant not found for Salla store: ${payload.merchant}`);
    return;
  }

  // Find product by Salla product ID
  const existingProduct = await prisma.product.findFirst({
    where: {
      sallaProductId: product.id.toString(),
      merchantId: merchant.id,
    },
  });

  if (!existingProduct) {
    console.log(`Product not found: ${product.id}`);
    return;
  }

  // Update product if needed
  await prisma.product.update({
    where: { id: existingProduct.id },
    data: {
      isActive: product.status === "active" || product.status === "sale",
    },
  });

  console.log(`Processed Salla product update: ${product.id}`);
}
