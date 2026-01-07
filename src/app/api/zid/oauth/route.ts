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
  const redirectWithStatus = (status: "connected" | "error") => {
    const url = new URL("/merchant/integrations", config.appBaseUrl);
    url.searchParams.set("zid", status);
    return NextResponse.redirect(url);
  };

  try {
    if (!code || !state) {
      return redirectWithStatus("error");
    }

    if (!cookieState || cookieState !== state) {
      return redirectWithStatus("error");
    }

    const secret = process.env.NEXTAUTH_SECRET || config.clientSecret;
    const payload = verifyOAuthState<{ merchantId: string }>(state, secret);

    if (!payload?.merchantId) {
      return redirectWithStatus("error");
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
      return redirectWithStatus("error");
    }

    const tokenData = await tokenResponse.json();
    const authorizationToken =
      tokenData.authorization ||
      tokenData.Authorization ||
      tokenData.authorization_token ||
      tokenData.authorizationToken ||
      null;
    const managerToken = tokenData.access_token || tokenData.accessToken || null;
    const refreshToken =
      tokenData.refresh_token || tokenData.refreshToken || null;
    const expiresRaw = tokenData.expires_in;
    const expiresIn =
      typeof expiresRaw === "number"
        ? expiresRaw
        : typeof expiresRaw === "string"
        ? Number(expiresRaw)
        : null;
    const tokenExpiry =
      expiresIn && Number.isFinite(expiresIn) && expiresIn > 0
        ? new Date(Date.now() + expiresIn * 1000)
        : null;

    const zidStoreId =
      tokenData.store_id || tokenData.storeId || tokenData.store?.id || null;
    const zidStoreUrl =
      tokenData.store_url || tokenData.storeUrl || tokenData.store?.url || null;

    if (!authorizationToken || !managerToken) {
      return redirectWithStatus("error");
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: payload.merchantId },
      select: { status: true },
    });

    if (!merchant) {
      return redirectWithStatus("error");
    }

    if (
      merchant.status === MerchantStatus.REJECTED ||
      merchant.status === MerchantStatus.SUSPENDED
    ) {
      return redirectWithStatus("error");
    }

    let storeUrl = normalizeStoreUrl(zidStoreUrl);

    try {
      const service = new ZidService({
        accessToken: authorizationToken,
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
        zidAccessToken: authorizationToken,
        zidRefreshToken: refreshToken,
        zidTokenExpiry: tokenExpiry,
        zidManagerToken: managerToken,
      },
    });

    try {
      await registerZidWebhooks({
        accessToken: authorizationToken,
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
  } catch (error) {
    console.error("Zid OAuth error:", error);
    return redirectWithStatus("error");
  }
}
