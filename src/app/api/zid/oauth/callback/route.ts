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
import { createRegistrationToken } from "@/lib/registrationToken";
import { getZidRedirectUri } from "@/lib/zid/getZidRedirectUri";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const tokenString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const toStringOrNull = (value: unknown): string | null => {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const extractZidTokens = (tokenData: Record<string, unknown>) => {
  const authorizationToken =
    tokenString(tokenData.Authorization) ??
    tokenString(tokenData.authorization) ??
    tokenString(tokenData.authorization_token) ??
    tokenString(tokenData.authorizationToken);
  const managerToken =
    tokenString(tokenData.access_token) ??
    tokenString(tokenData.manager_token) ??
    tokenString(tokenData.accessToken);
  const refreshToken =
    tokenString(tokenData.refresh_token) ??
    tokenString(tokenData.refreshToken);
  const expiresRaw = tokenData.expires_in;
  const expiresIn =
    typeof expiresRaw === "number"
      ? expiresRaw
      : typeof expiresRaw === "string"
      ? Number(expiresRaw)
      : null;

  return {
    authorizationToken,
    managerToken,
    refreshToken,
    expiresIn: Number.isFinite(expiresIn) ? expiresIn : null,
  };
};

const redirectWithStatus = (
  config: ReturnType<typeof getZidConfig>,
  status: "connected" | "error",
  errorCode?: string
) => {
  const url = new URL("/merchant/integrations", config.appBaseUrl);
  url.searchParams.set("zid", status);
  if (errorCode) {
    url.searchParams.set("error", errorCode);
  }
  return NextResponse.redirect(url);
};

export async function GET(request: NextRequest) {
  const config = getZidConfig();
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  // Check if this is a join flow or regular flow
  const isJoinFlow =
    request.cookies.get("raff_zid_join_flow")?.value === "true";

  if (!code || !state) {
    return redirectWithStatus(config, "error");
  }

  // Handle join flow (new merchant registration)
  if (isJoinFlow) {
    try {
      return await handleJoinFlow(request, code, state, config);
    } catch (error) {
      console.error("Zid join flow failed:", error);
      const errorCode =
        error instanceof Error && error.message === "zid_missing_tokens"
          ? "missing_tokens"
          : undefined;
      return redirectWithStatus(config, "error", errorCode);
    }
  }

  // Handle regular flow (existing merchant connecting store)
  try {
    return await handleRegularFlow(request, code, state, config);
  } catch (error) {
    console.error("Zid OAuth callback failed:", error);
    const errorCode =
      error instanceof Error && error.message === "zid_missing_tokens"
        ? "missing_tokens"
        : undefined;
    return redirectWithStatus(config, "error", errorCode);
  }
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
    return redirectWithStatus(config, "error");
  }

  // Exchange code for tokens
  const tokenBody = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: getZidRedirectUri(request),
  });

  const tokenResponse = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenBody,
  });

  if (!tokenResponse.ok) {
    return redirectWithStatus(config, "error");
  }

  const tokenData = (await tokenResponse.json()) as Record<string, unknown>;
  const { authorizationToken, managerToken, refreshToken, expiresIn } =
    extractZidTokens(tokenData);
  const tokenExpiry =
    expiresIn && expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000) : null;
  const storePayload = isRecord(tokenData.store) ? tokenData.store : null;
  let zidStoreId =
    toStringOrNull(tokenData.store_id) ??
    toStringOrNull(tokenData.storeId) ??
    (storePayload ? toStringOrNull(storePayload.id) : null) ??
    null;
  const zidStoreUrl =
    toStringOrNull(tokenData.store_url) ??
    toStringOrNull(tokenData.storeUrl) ??
    (storePayload ? toStringOrNull(storePayload.url) : null) ??
    null;

  if (!authorizationToken || !managerToken) {
    throw new Error("zid_missing_tokens");
  }

  // Fetch store information from Zid API
  let storeName = "Zid Store";
  let storeEmail = null;
  let storeUrl = normalizeStoreUrl(zidStoreUrl);

  try {
    const service = new ZidService({
      accessToken: authorizationToken,
      storeId: zidStoreId,
      managerToken,
    });
    const profile = await service.fetchStoreProfile();
    if (profile) {
      storeName = profile.name || storeName;
      storeEmail = profile.email || null;
      if (!zidStoreId && profile.id) {
        zidStoreId = String(profile.id);
      }
      const profileStoreUrl = profile.domain || null;
      if (profileStoreUrl) {
        storeUrl = normalizeStoreUrl(profileStoreUrl);
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
        zidAccessToken: authorizationToken,
        zidRefreshToken: refreshToken,
        zidTokenExpiry: tokenExpiry,
        zidManagerToken: managerToken,
        zidStoreUrl: storeUrl || undefined,
      },
    });

    // Try to register webhooks
    try {
      await registerZidWebhooks({
        accessToken: authorizationToken,
        managerToken,
      });
    } catch (error) {
      console.error("Zid webhook registration failed:", error);
    }

    const response = NextResponse.redirect(
      `${config.appBaseUrl}/merchant/integrations?connected=zid`
    );
    response.cookies.set("raff_zid_join_state", "", { maxAge: 0, path: "/" });
    response.cookies.set("raff_zid_join_flow", "", { maxAge: 0, path: "/" });
    return response;
  }

  // Create new user and merchant with incomplete registration
  const tempPassword = crypto.randomBytes(32).toString("hex");
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  // Use transaction to create both user and merchant
  const { user, merchant } = await prisma.$transaction(async (tx) => {
    // Create user with incomplete registration
    const user = await tx.user.create({
      data: {
        name: storeName,
        email, // Temporary email (might be fake)
        passwordHash, // Temporary password
        role: UserRole.MERCHANT,
        language: "ar",
        emailVerified: null, // Not verified yet
        registrationCompleted: false, // Mark as incomplete
      },
    });

    // Create merchant profile
    const merchant = await tx.merchant.create({
      data: {
        userId: user.id,
        name: storeName,
        nameAr: storeName,
        email,
        status: MerchantStatus.APPROVED, // Auto-approved since Zid verified them
        isActive: true,
        zidStoreId: zidStoreId || undefined,
        zidStoreUrl: storeUrl || undefined,
        zidAccessToken: authorizationToken,
        zidRefreshToken: refreshToken,
        zidTokenExpiry: tokenExpiry,
        zidManagerToken: managerToken,
      },
    });

    return { user, merchant };
  });

  // Try to register webhooks
  try {
    await registerZidWebhooks({
      accessToken: authorizationToken,
      managerToken,
    });
  } catch (error) {
    console.error("Zid webhook registration failed:", error);
  }

  // Create registration token
  const registrationToken = createRegistrationToken(
    user.id,
    merchant.id,
    storeEmail || "" // Pass the store email if available
  );

  // Redirect to complete registration page
  const response = NextResponse.redirect(
    `${config.appBaseUrl}/merchant/complete-registration?token=${registrationToken}`
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
    return redirectWithStatus(config, "error");
  }

  const secret = process.env.NEXTAUTH_SECRET || config.clientSecret;
  const payload = verifyOAuthState<{ merchantId: string }>(state, secret);

  if (!payload?.merchantId) {
    return redirectWithStatus(config, "error");
  }

  const tokenBody = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: getZidRedirectUri(request),
  });

  const tokenResponse = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenBody,
  });

  if (!tokenResponse.ok) {
    return redirectWithStatus(config, "error");
  }

  const tokenData = (await tokenResponse.json()) as Record<string, unknown>;
  const { authorizationToken, managerToken, refreshToken, expiresIn } =
    extractZidTokens(tokenData);
  const tokenExpiry =
    expiresIn && expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000) : null;
  const storePayload = isRecord(tokenData.store) ? tokenData.store : null;
  let zidStoreId =
    toStringOrNull(tokenData.store_id) ??
    toStringOrNull(tokenData.storeId) ??
    (storePayload ? toStringOrNull(storePayload.id) : null) ??
    null;
  const zidStoreUrl =
    toStringOrNull(tokenData.store_url) ??
    toStringOrNull(tokenData.storeUrl) ??
    (storePayload ? toStringOrNull(storePayload.url) : null) ??
    null;

  if (!authorizationToken || !managerToken) {
    throw new Error("zid_missing_tokens");
  }

  const merchant = await prisma.merchant.findUnique({
    where: { id: payload.merchantId },
    select: { status: true },
  });

  if (!merchant) {
    return redirectWithStatus(config, "error");
  }

  if (
    merchant.status === MerchantStatus.REJECTED ||
    merchant.status === MerchantStatus.SUSPENDED
  ) {
    return redirectWithStatus(config, "error");
  }

  let storeUrl = normalizeStoreUrl(zidStoreUrl);

  try {
    const service = new ZidService({
      accessToken: authorizationToken,
      storeId: zidStoreId,
      managerToken,
    });
    const profile = await service.fetchStoreProfile();
    if (profile) {
      if (!zidStoreId && profile.id) {
        zidStoreId = String(profile.id);
      }
      if (profile.domain) {
        storeUrl = normalizeStoreUrl(profile.domain);
      }
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
    `${config.appBaseUrl}/merchant/integrations?connected=zid`
  );
  response.cookies.set("raff_zid_oauth_state", "", { maxAge: 0, path: "/" });
  return response;
}
