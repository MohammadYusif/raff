// src/app/api/webhooks/zid/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import crypto from "crypto";
import { notifyOrderCreated } from "@/lib/services/notification.service";

// Zid webhook events
interface ZidWebhookPayload {
  event: string;
  store_id?: string; // Store identifier at root level
  data: {
    id: string;
    store_id?: string; // Store identifier in data
    order_id?: string;
    status?: string;
    total?: number;
    items?: Array<{
      product_id: string;
      quantity: number;
      price: number;
    }>;
    customer?: {
      id: string;
      name: string;
      email: string;
    };
    created_at?: string;
    updated_at?: string;
  };
}

// Verify Zid webhook signature
function verifyZidSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payload);
  const digest = hmac.digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const signature = headersList.get("x-zid-signature");
    const deliveryId = headersList.get("x-zid-webhook-id") || headersList.get("x-webhook-id");
    const webhookSecret = process.env.ZID_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("ZID_WEBHOOK_SECRET not configured");
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
        console.error("Zid webhook missing signature");
        return NextResponse.json(
          { error: "Missing signature" },
          { status: 401 }
        );
      }
      console.warn("Zid webhook missing signature - allowed in dev mode");
    } else if (!verifyZidSignature(rawBody, signature, webhookSecret)) {
      console.error("Invalid Zid webhook signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    const payload: ZidWebhookPayload = JSON.parse(rawBody);

    // Normalize event type (defensive against provider field name changes)
    const eventType = String(
      payload.event || (payload as any).event_type || (payload as any).type || "unknown"
    );

    if (eventType === "unknown") {
      console.error("Zid webhook missing event type field");
      return NextResponse.json({
        success: false,
        reason: "missing_event_type",
      });
    }

    // Extract store ID from payload (required for deduplication)
    // Always convert to string for consistent DB storage
    const rawStoreId = payload.store_id || payload.data?.store_id;

    if (!rawStoreId) {
      console.error("Zid webhook missing store_id in payload - cannot process", {
        event: eventType,
        hasData: !!payload.data,
      });
      // Return 200 to prevent retry storms for malformed webhooks
      return NextResponse.json({
        success: false,
        reason: "missing_store_id",
      });
    }

    const storeId = String(rawStoreId);

    // Idempotency key: Use delivery header ID if available, otherwise hash of payload
    const contentHash = deliveryId || crypto.createHash('sha256').update(rawBody).digest('hex');
    const idempotencyKey = `${eventType}:${contentHash}`;

    // Log when delivery header is missing
    if (!deliveryId) {
      console.warn(`Zid webhook missing delivery header ID, using content hash for event: ${eventType}`);
    }

    // Atomic insert with unique constraint - handles race conditions
    try {
      await prisma.webhookEvent.create({
        data: {
          platform: "ZID",
          storeId,
          eventType,
          idempotencyKey,
          deliveryHeaderId: deliveryId,
          payload: payload as any,
          processingStatus: "PROCESSED",
        },
      });
    } catch (error: any) {
      // P2002 = Unique constraint violation (duplicate)
      if (error.code === 'P2002') {
        console.log(`Duplicate Zid webhook ignored: ${idempotencyKey}`);
        return NextResponse.json({ success: true, duplicate: true });
      }
      throw error;
    }

    // Handle different webhook events
    try {
      switch (eventType) {
        case "order.created":
        case "order.updated":
          await handleOrderEvent(payload);
          break;

        case "product.created":
        case "product.updated":
          await handleProductEvent(payload);
          break;

        default:
          console.log(`Unhandled Zid webhook event: ${payload.event}`);
      }
    } catch (processingError) {
      // Update webhook event status to FAILED using composite unique constraint
      await prisma.webhookEvent.updateMany({
        where: {
          platform: "ZID",
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
    console.error("Error processing Zid webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handleOrderEvent(payload: ZidWebhookPayload) {
  const { data } = payload;

  // Find merchant by Zid store ID (extracted from webhook or stored)
  // For now, we'll need to match products to find the merchant
  if (!data.items || data.items.length === 0) {
    console.log("No items in order, skipping");
    return;
  }

  // Get product IDs from order items
  const productIds = data.items.map((item) => item.product_id);

  // Find products in our database
  const products = await prisma.product.findMany({
    where: {
      zidProductId: { in: productIds },
    },
    select: {
      id: true,
      merchantId: true,
      price: true,
    },
  });

  if (products.length === 0) {
    console.log("No matching products found for order");
    return;
  }

  // Use the first product's merchant (they should all be the same)
  const merchantId = products[0].merchantId;
  const orderId = data.order_id || data.id;

  const order = await prisma.order.upsert({
    where: {
      zidOrderId: orderId,
    },
    create: {
      merchantId,
      zidOrderId: orderId,
      platform: "ZID",
      zidStatus: data.status || "PENDING",
      totalPrice: data.total || 0,
      currency: "SAR",
      customerName: data.customer?.name || null,
      customerEmail: data.customer?.email || null,
      createdAt: data.created_at ? new Date(data.created_at) : new Date(),
    },
    update: {
      zidStatus: data.status || "PENDING",
      totalPrice: data.total || 0,
    },
  });

  // Get merchant's user ID for notification
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { userId: true },
  });

  // Send notification if this is a new order
  if (merchant?.userId && payload.event === "order.created") {
    await notifyOrderCreated(
      merchant.userId,
      order.id,
      Number(data.total || 0),
      "SAR"
    ).catch((err) => console.error("Failed to send notification:", err));
  }

  console.log(`Processed Zid order: ${orderId}`);
}

async function handleProductEvent(payload: ZidWebhookPayload) {
  const { data } = payload;

  // Find product by Zid product ID
  const product = await prisma.product.findFirst({
    where: {
      zidProductId: data.id,
    },
  });

  if (!product) {
    console.log(`Product not found: ${data.id}`);
    return;
  }

  // Update product if needed (e.g., status changes)
  if (data.status !== undefined) {
    await prisma.product.update({
      where: { id: product.id },
      data: {
        isActive: data.status === "active",
      },
    });
  }

  console.log(`Processed Zid product update: ${data.id}`);
}
