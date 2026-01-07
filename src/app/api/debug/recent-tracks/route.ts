// src/app/api/debug/recent-tracks/route.ts
/**
 * Debug endpoint to view recent click tracking activity
 * GET /api/debug/recent-tracks
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Get last 20 click tracking records
    const recentTracks = await prisma.clickTracking.findMany({
      take: 20,
      orderBy: { clickedAt: "desc" },
      select: {
        id: true,
        trackingId: true,
        productId: true,
        platform: true,
        destinationUrl: true,
        converted: true,
        convertedCount: true,
        clickedAt: true,
        expiresAt: true,
        product: {
          select: {
            title: true,
            slug: true,
          },
        },
      },
    });

    // Get last 20 outbound click events (includes disqualified clicks)
    const recentEvents = await prisma.outboundClickEvent.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        trackingId: true,
        productId: true,
        platform: true,
        qualified: true,
        disqualifyReason: true,
        createdAt: true,
      },
    });

    // Get commission count
    const commissionCount = await prisma.commission.count();
    const pendingCommissions = await prisma.commission.count({
      where: { status: "PENDING" },
    });
    const approvedCommissions = await prisma.commission.count({
      where: { status: "APPROVED" },
    });

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      stats: {
        totalClickTracks: await prisma.clickTracking.count(),
        totalCommissions: commissionCount,
        pendingCommissions,
        approvedCommissions,
      },
      recentQualifiedTracks: recentTracks,
      recentClickEvents: recentEvents,
    });
  } catch (error) {
    console.error("Debug endpoint error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tracking data" },
      { status: 500 }
    );
  }
}
