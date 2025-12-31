// src/app/api/zid/oauth/route.ts
import { NextRequest, NextResponse } from "next/server";
import { MerchantStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getZidConfig } from "@/lib/platform/config";
import { verifyOAuthState } from "@/lib/platform/oauth";
import { ZidService } from "@/lib/services/zid.service";
import { normalizeStoreUrl } from "@/lib/platform/store";
import { registerZidWebhooks } from "@/lib/platform/webhook-register";

export async function GET(request: NextRequest) {
  const config = getZidConfig();
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const cookieState = request.cookies.get("raff_zid_oauth_state")?.value;

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

  const tokenBody = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
  });

  const tokenResponse = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenBody,
  });

  if (!tokenResponse.ok) {
    return NextResponse.json(
      { error: "Failed to exchange Zid OAuth code" },
      { status: 400 }
    );
  }

  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token as string | undefined;
  const refreshToken = tokenData.refresh_token as string | undefined;
  const expiresIn = tokenData.expires_in as number | undefined;
  const tokenExpiry = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;
  const managerToken =
    tokenData.manager_token ||
    tokenData.managerToken ||
    tokenData.x_manager_token ||
    null;

  const zidStoreId =
    tokenData.store_id || tokenData.storeId || tokenData.store?.id || null;
  const zidStoreUrl =
    tokenData.store_url || tokenData.storeUrl || tokenData.store?.url || null;

  if (!accessToken) {
    return NextResponse.json(
      { error: "Zid access token missing" },
      { status: 400 }
    );
  }

  const merchant = await prisma.merchant.findUnique({
    where: { id: payload.merchantId },
    select: { status: true },
  });

  if (!merchant) {
    return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
  }

  if (
    merchant.status === MerchantStatus.REJECTED ||
    merchant.status === MerchantStatus.SUSPENDED
  ) {
    return NextResponse.json(
      { error: "Merchant is disabled" },
      { status: 403 }
    );
  }

  let storeUrl = normalizeStoreUrl(zidStoreUrl);

  try {
    const service = new ZidService({
      accessToken,
      storeId: zidStoreId,
      managerToken,
    });
    const profile = await service.fetchStoreProfile();
    if (profile?.domain) {
      storeUrl = normalizeStoreUrl(profile.domain);
    }
  } catch (error) {
    console.error("Failed to fetch Zid profile:", error);
  }

  await prisma.merchant.update({
    where: { id: payload.merchantId },
    data: {
      zidStoreId: zidStoreId || undefined,
      zidStoreUrl: storeUrl || undefined,
      zidAccessToken: accessToken,
      zidRefreshToken: refreshToken || null,
      zidTokenExpiry: tokenExpiry,
      zidManagerToken: managerToken,
    },
  });

  try {
    await registerZidWebhooks({
      accessToken,
      managerToken,
    });
  } catch (error) {
    console.error("Zid webhook registration failed:", error);
  }

  const response = NextResponse.redirect(
    `${config.appBaseUrl}/merchant/dashboard?connected=zid`
  );
  response.cookies.set("raff_zid_oauth_state", "", { maxAge: 0, path: "/" });
  return response;
}
