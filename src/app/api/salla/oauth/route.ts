// src/app/api/salla/oauth/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSallaConfig } from "@/lib/platform/config";
import { verifyOAuthState } from "@/lib/platform/oauth";
import { normalizeStoreUrl } from "@/lib/platform/store";
import { registerSallaWebhooks } from "@/lib/platform/webhook-register";

export async function GET(request: NextRequest) {
  const config = getSallaConfig();
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const cookieState = request.cookies.get("raff_salla_oauth_state")?.value;

  if (!code || !state) {
    return NextResponse.json(
      { error: "Missing OAuth code or state" },
      { status: 400 }
    );
  }

  if (!cookieState || cookieState !== state) {
    return NextResponse.json({ error: "Invalid OAuth state" }, { status: 400 });
  }

  const secret = process.env.NEXTAUTH_SECRET || config.clientSecret;
  const payload = verifyOAuthState<{ merchantId: string }>(state, secret);

  if (!payload?.merchantId) {
    return NextResponse.json({ error: "Invalid OAuth state" }, { status: 400 });
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
  });

  const tokenResponse = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!tokenResponse.ok) {
    return NextResponse.json(
      { error: "Failed to exchange Salla OAuth code" },
      { status: 400 }
    );
  }

  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token as string | undefined;
  const refreshToken = tokenData.refresh_token as string | undefined;
  const expiresIn = tokenData.expires_in as number | undefined;
  const tokenExpiry = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;
  const sallaStoreId =
    tokenData.store_id || tokenData.storeId || tokenData.store?.id || null;
  const sallaStoreUrl =
    tokenData.store_url || tokenData.storeUrl || tokenData.store?.url || null;

  if (!accessToken) {
    return NextResponse.json(
      { error: "Salla access token missing" },
      { status: 400 }
    );
  }

  await prisma.merchant.update({
    where: { id: payload.merchantId },
    data: {
      sallaStoreId: sallaStoreId || undefined,
      sallaStoreUrl: normalizeStoreUrl(sallaStoreUrl) || undefined,
      sallaAccessToken: accessToken,
      sallaRefreshToken: refreshToken || null,
      sallaTokenExpiry: tokenExpiry,
    },
  });

  try {
    await registerSallaWebhooks({
      accessToken,
    });
  } catch (error) {
    console.error("Salla webhook registration failed:", error);
  }

  const response = NextResponse.redirect(
    `${config.appBaseUrl}/merchant/dashboard?connected=salla`
  );
  response.cookies.set("raff_salla_oauth_state", "", { maxAge: 0, path: "/" });
  return response;
}
