// src/app/api/admin/logs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth/admin-guard";
import { logStore } from "@/lib/utils/logger";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("api-admin-logs");


export async function GET(request: NextRequest) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);

    const logs = logStore.getAll(limit);

    return NextResponse.json({
      logs,
      count: logs.length,
    });
  } catch (error) {
    logger.error("Error fetching logs", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  try {
    logStore.clear();
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error clearing logs", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Failed to clear logs" },
      { status: 500 }
    );
  }
}
