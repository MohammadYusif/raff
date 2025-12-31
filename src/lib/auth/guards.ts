import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/auth";

type ApiGuardResult = { session: Session } | { response: NextResponse };

export async function requireAuth(context?: "api"): Promise<ApiGuardResult>;
export async function requireAuth(context: "page"): Promise<Session>;
export async function requireAuth(
  context: "api" | "page" = "page"
): Promise<ApiGuardResult | Session> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    if (context === "page") {
      redirect("/auth/login");
    }
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  return context === "page" ? session : { session };
}

export async function requireMerchant(
  context?: "api"
): Promise<ApiGuardResult>;
export async function requireMerchant(context: "page"): Promise<Session>;
export async function requireMerchant(
  context: "api" | "page" = "page"
): Promise<ApiGuardResult | Session> {
  if (context === "page") {
    const session = await requireAuth("page");
    const role = session.user.role;
    const merchantId = session.user.merchantId;
    const isAllowed = role === "MERCHANT" || role === "ADMIN";

    if (!isAllowed || !merchantId) {
      redirect("/");
    }

    return session;
  }

  const authResult = await requireAuth("api");
  if ("response" in authResult) {
    return authResult;
  }

  const { session } = authResult;
  const role = session.user.role;
  const merchantId = session.user.merchantId;
  const isAllowed = role === "MERCHANT" || role === "ADMIN";

  if (!isAllowed || !merchantId) {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { session };
}
