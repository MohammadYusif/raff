// src/app/api/zid/oauth/callback/route.ts
/**
 * Zid OAuth Callback - Handles both existing and new merchants
 *
 * This endpoint handles OAuth callbacks from Zid for:
 * 1. New merchant registration (join flow)
 * 2. Existing merchant connection (regular flow)
 *
 * Determines which flow based on presence of raff_zid_join_flow cookie
 */

import { NextRequest, NextResponse } from "next/server";
import { MerchantStatus, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getZidConfig } from "@/lib/platform/config";
import { normalizeStoreUrl } from "@/lib/platform/store";
import { registerZidWebhooks } from "@/lib/platform/webhook-register";
import { verifyOAuthState } from "@/lib/platform/oauth";
import { ZidService } from "@/lib/services/zid.service";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const config = getZidConfig();
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  // Check if this is a join flow or regular flow
  const isJoinFlow =
    request.cookies.get("raff_zid_join_flow")?.value === "true";

  if (!code || !state) {
    return NextResponse.json(
      { error: "Missing OAuth code or state" },
      { status: 400 }
    );
  }

  // Handle join flow (new merchant registration)
  if (isJoinFlow) {
    return handleJoinFlow(request, code, state, config);
  }

  // Handle regular flow (existing merchant connecting store)
  return handleRegularFlow(request, code, state, config);
}

/**
 * Handle new merchant registration flow
 */
async function handleJoinFlow(
  request: NextRequest,
  code: string,
  state: string,
  config: ReturnType<typeof getZidConfig>
) {
  const cookieState = request.cookies.get("raff_zid_join_state")?.value;

  if (!cookieState || cookieState !== state) {
    return NextResponse.json({ error: "Invalid OAuth state" }, { status: 400 });
  }

  // Exchange code for tokens
  const tokenBody = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: `${config.appBaseUrl}/api/zid/oauth/callback`,
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
  const tokenExpiry = expiresIn
    ? new Date(Date.now() + expiresIn * 1000)
    : null;
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

  // Fetch store information from Zid API
  let storeName = "Zid Store";
  let storeEmail = null;
  let storeUrl = normalizeStoreUrl(zidStoreUrl);

  try {
    const service = new ZidService({
      accessToken,
      storeId: zidStoreId,
      managerToken,
    });
    const profile = await service.fetchStoreProfile();
    if (profile) {
      storeName = profile.name || storeName;
      storeEmail = profile.email || null;
      if (profile.domain) {
        storeUrl = normalizeStoreUrl(profile.domain);
      }
    }
  } catch (error) {
    console.error("Failed to fetch Zid store info:", error);
  }

  // Generate email if not provided
  const email =
    storeEmail ||
    `zid-${zidStoreId || crypto.randomBytes(8).toString("hex")}@raff.merchants`;

  // Check if user/merchant already exists with this Zid store
  let existingMerchant = null;
  if (zidStoreId) {
    existingMerchant = await prisma.merchant.findFirst({
      where: { zidStoreId },
      include: { user: true },
    });
  }

  if (existingMerchant) {
    // Merchant already exists, just update tokens
    await prisma.merchant.update({
      where: { id: existingMerchant.id },
      data: {
        zidAccessToken: accessToken,
        zidRefreshToken: refreshToken || null,
        zidTokenExpiry: tokenExpiry,
        zidManagerToken: managerToken,
        zidStoreUrl: storeUrl || undefined,
      },
    });

    // Try to register webhooks
    try {
      await registerZidWebhooks({ accessToken, managerToken });
    } catch (error) {
      console.error("Zid webhook registration failed:", error);
    }

    const response = NextResponse.redirect(
      `${config.appBaseUrl}/merchant/dashboard?connected=zid`
    );
    response.cookies.set("raff_zid_join_state", "", { maxAge: 0, path: "/" });
    response.cookies.set("raff_zid_join_flow", "", { maxAge: 0, path: "/" });
    return response;
  }

  // Create new user and merchant
  const tempPassword = crypto.randomBytes(16).toString("hex");
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  // Use transaction to create both user and merchant
  await prisma.$transaction(async (tx) => {
    // Create user
    const user = await tx.user.create({
      data: {
        name: storeName,
        email,
        passwordHash,
        role: UserRole.MERCHANT,
        language: "ar",
        emailVerified: new Date(), // Auto-verify since they authenticated via OAuth
      },
    });

    // Create merchant profile
    const merchant = await tx.merchant.create({
      data: {
        userId: user.id,
        name: storeName,
        nameAr: storeName,
        email,
        status: MerchantStatus.PENDING, // Requires admin approval
        isActive: true,
        zidStoreId: zidStoreId || undefined,
        zidStoreUrl: storeUrl || undefined,
        zidAccessToken: accessToken,
        zidRefreshToken: refreshToken || null,
        zidTokenExpiry: tokenExpiry,
        zidManagerToken: managerToken,
      },
    });

    return { user, merchant };
  });

  // Try to register webhooks
  try {
    await registerZidWebhooks({ accessToken, managerToken });
  } catch (error) {
    console.error("Zid webhook registration failed:", error);
  }

  const response = NextResponse.redirect(
    `${config.appBaseUrl}/merchant/dashboard?registered=true&platform=zid`
  );
  response.cookies.set("raff_zid_join_state", "", { maxAge: 0, path: "/" });
  response.cookies.set("raff_zid_join_flow", "", { maxAge: 0, path: "/" });

  return response;
}

/**
 * Handle existing merchant connecting their store
 */
async function handleRegularFlow(
  request: NextRequest,
  code: string,
  state: string,
  config: ReturnType<typeof getZidConfig>
) {
  const cookieState = request.cookies.get("raff_zid_oauth_state")?.value;

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
  const tokenExpiry = expiresIn
    ? new Date(Date.now() + expiresIn * 1000)
    : null;
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
    await registerZidWebhooks({ accessToken, managerToken });
  } catch (error) {
    console.error("Zid webhook registration failed:", error);
  }

  const response = NextResponse.redirect(
    `${config.appBaseUrl}/merchant/dashboard?connected=zid`
  );
  response.cookies.set("raff_zid_oauth_state", "", { maxAge: 0, path: "/" });
  return response;
}
