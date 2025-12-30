// src/app/api/products/track/route.ts
// PURPOSE: Track product engagement events (clicks, views, saves)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, eventType } = body;

    if (!productId || !eventType) {
      return NextResponse.json(
        { error: "productId and eventType are required" },
        { status: 400 }
      );
    }

    // Validate event type
    const validEvents = ["VIEW", "CLICK", "ORDER", "SAVE"];
    if (!validEvents.includes(eventType)) {
      return NextResponse.json(
        { error: "Invalid event type" },
        { status: 400 }
      );
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Determine weight based on event type
    const weights: Record<string, number> = {
      VIEW: 1.0,
      CLICK: 5.0,
      ORDER: 20.0,
      SAVE: 3.0,
    };

    const weight = weights[eventType] || 1.0;

    // Create trending log entry (fail-soft)
    try {
      await prisma.trendingLog.create({
        data: {
          productId,
          eventType: eventType as "VIEW" | "CLICK" | "ORDER" | "SAVE",
          weight,
          metadata: {
            timestamp: new Date().toISOString(),
            userAgent: request.headers.get("user-agent") || "unknown",
          },
        },
      });
    } catch (error) {
      console.warn("Failed to log trending event:", error);
    }

    // Update product counters based on event type
    if (eventType === "CLICK") {
      await prisma.product.update({
        where: { id: productId },
        data: {
          clickCount: { increment: 1 },
        },
      });
    }

    return NextResponse.json(
      { success: true, message: "Event tracked successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error tracking product event:", error);
    return NextResponse.json(
      { error: "Failed to track event" },
      { status: 500 }
    );
  }
}
