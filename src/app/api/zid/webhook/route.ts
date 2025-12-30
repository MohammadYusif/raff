// src/app/api/zid/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getZidConfig } from "@/lib/platform/config";
import {
  getHeaderValue,
  maskSensitive,
  safeJsonParse,
  timingSafeEqual,
} from "@/lib/platform/webhooks";
import {
  deactivateZidProduct,
  syncZidProductById,
} from "@/lib/services/zid.service";

const ZID_PRODUCT_UPSERT_EVENTS = new Set([
  "product.create",
  "product.update",
  "product.created",
  "product.updated",
]);

const ZID_PRODUCT_DELETE_EVENTS = new Set([
  "product.delete",
  "product.deleted",
  "product.removed",
]);

function extractStoreId(payload: Record<string, any>): string | null {
  return (
    payload.store_id ||
    payload.storeId ||
    payload.store?.id ||
    payload.data?.store_id ||
    payload.data?.store?.id ||
    null
  );
}

function extractEvent(payload: Record<string, any>): string | null {
  return (
    payload.event ||
    payload.event_type ||
    payload.type ||
    payload.data?.event ||
    null
  );
}

function extractProductId(payload: Record<string, any>): string | null {
  return (
    payload.product_id ||
    payload.product?.id ||
    payload.data?.product_id ||
    payload.data?.product?.id ||
    null
  );
}

export async function POST(request: NextRequest) {
  const config = getZidConfig();
  const headerName = config.webhook.header;
  const secret = config.webhook.secret;

  if (!headerName || !secret) {
    return NextResponse.json(
      { error: "Webhook configuration missing" },
      { status: 500 }
    );
  }

  const headerValue = getHeaderValue(request.headers, headerName);
  if (!headerValue || !timingSafeEqual(headerValue, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await request.text();
  const payload = safeJsonParse<Record<string, any>>(rawBody);

  if (!payload) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const shouldLogPayloads =
    process.env.NODE_ENV !== "production" ||
    process.env.LOG_WEBHOOK_PAYLOADS === "true";
  if (shouldLogPayloads) {
    console.info("Zid webhook received", {
      headers: maskSensitive(Object.fromEntries(request.headers.entries())),
      payload: maskSensitive(payload),
    });
  }

  const storeId = extractStoreId(payload);
  if (!storeId) {
    return NextResponse.json(
      { error: "Missing store identifier" },
      { status: 400 }
    );
  }

  const merchant = await prisma.merchant.findFirst({
    where: { zidStoreId: storeId },
    select: {
      id: true,
      zidAccessToken: true,
      zidRefreshToken: true,
      zidTokenExpiry: true,
      zidManagerToken: true,
      zidStoreId: true,
      zidStoreUrl: true,
    },
  });

  if (!merchant) {
    return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
  }

  const event = (extractEvent(payload) || "").toLowerCase();
  const productId = extractProductId(payload);

  if (productId) {
    if (ZID_PRODUCT_DELETE_EVENTS.has(event)) {
      await deactivateZidProduct(merchant.id, productId);
    } else if (ZID_PRODUCT_UPSERT_EVENTS.has(event)) {
      await syncZidProductById(merchant, productId);
    }
  }

  return NextResponse.json({ status: "ok" });
}
