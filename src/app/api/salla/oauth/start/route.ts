// src/app/api/salla/oauth/start/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getSallaConfig } from "@/lib/platform/config";
import { createOAuthState } from "@/lib/platform/oauth";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const merchantId =
    request.nextUrl.searchParams.get("merchantId") || session?.user?.id;

  if (!merchantId) {
    return NextResponse.json(
      { error: "Merchant ID is required" },
      { status: 400 }
    );
  }

  const merchant = await prisma.merchant.findFirst({
    where: { id: merchantId, status: "APPROVED", isActive: true },
    select: { id: true },
  });

  if (!merchant) {
    return NextResponse.json(
      { error: "Merchant not found or not approved" },
      { status: 404 }
    );
  }

  const config = getSallaConfig();
  const secret = process.env.NEXTAUTH_SECRET || config.clientSecret;
  const state = createOAuthState(
    { merchantId: merchant.id, platform: "salla", ts: Date.now() },
    secret
  );

  const url = new URL(config.authUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  if (config.scopes.length) {
    url.searchParams.set("scope", config.scopes.join(" "));
  }
  url.searchParams.set("state", state);

  const response = NextResponse.redirect(url.toString());
  response.cookies.set("raff_salla_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
    path: "/",
  });

  return response;
}
