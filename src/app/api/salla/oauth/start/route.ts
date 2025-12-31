// src/app/api/salla/oauth/start/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSallaConfig } from "@/lib/platform/config";
import { createOAuthState } from "@/lib/platform/oauth";
import { requireMerchant } from "@/lib/auth/guards";

export async function GET(_request: NextRequest) {
  const auth = await requireMerchant("api");
  if ("response" in auth) return auth.response;
  const { session } = auth;
  const merchantId = session.user.merchantId;
  if (!merchantId) {
    return NextResponse.json(
      { error: "Merchant profile not linked" },
      { status: 403 }
    );
  }

  const merchant = await prisma.merchant.findFirst({
    where: {
      id: merchantId,
      userId: session.user.id,
      status: "APPROVED",
      isActive: true,
    },
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
