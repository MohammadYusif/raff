// src/lib/auth/admin-guard.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@prisma/client";

/**
 * Admin authentication guard for sensitive endpoints
 * Returns error response if not authenticated as admin, or null if authorized
 */
export async function requireAdminAuth(): Promise<NextResponse | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}
