// src/app/api/health/route.ts
// PURPOSE: Health check endpoint for monitoring and deployments

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      database: "connected",
      version: process.env.npm_package_version || "unknown",
    });
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      {
        ok: false,
        timestamp: new Date().toISOString(),
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
