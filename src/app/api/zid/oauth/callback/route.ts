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
import { isZidConnected } from "@/lib/zid/isZidConnected";
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

const logZidOAuthSaved = (params: {
  merchantId: string;
  storeId: string | null;
  storeUrl: string | null;
  accessToken: string | null;
  managerToken: string | null;
  refreshToken: string | null;
  stateVerified: boolean;
}) => {
  const connected = isZidConnected({
    zidStoreId: params.storeId,
    zidStoreUrl: params.storeUrl,
    zidAccessToken: params.accessToken,
    zidManagerToken: params.managerToken,
  });
  console.info("[zid-oauth] tokens saved", {
    merchantId: params.merchantId,
    connected,
    stateVerified: params.stateVerified,
    hasStoreId: Boolean(params.storeId),
    hasStoreUrl: Boolean(params.storeUrl),
    hasAccessToken: Boolean(params.accessToken),
    accessTokenLength: params.accessToken?.length ?? 0,
    hasManagerToken: Boolean(params.managerToken),
    managerTokenLength: params.managerToken?.length ?? 0,
    hasRefreshToken: Boolean(params.refreshToken),
    refreshTokenLength: params.refreshToken?.length ?? 0,
  });
};

export async function GET(request: NextRequest) {
  // TRIPWIRE: Log immediately to confirm endpoint is reached
  console.info("[zid-oauth-callback] TRIPWIRE - Endpoint hit", {
    timestamp: new Date().toISOString(),
    url: request.url,
  });

  const config = getZidConfig();
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");
  const errorDescription = request.nextUrl.searchParams.get("error_description");

  // Check if this is a join flow or regular flow
  const joinFlowCookie = request.cookies.get("raff_zid_join_flow")?.value;
  const joinStateCookie = request.cookies.get("raff_zid_join_state")?.value;
  const regularStateCookie = request.cookies.get("raff_zid_oauth_state")?.value;
  const isJoinFlow = joinFlowCookie === "true";

  console.info("[zid-oauth-callback] received", {
    url: request.url,
    hasCode: Boolean(code),
    codeLength: code?.length,
    hasState: Boolean(state),
    stateLength: state?.length,
    hasError: Boolean(error),
    error,
    errorDescription,
    isJoinFlow,
    hasJoinFlowCookie: Boolean(joinFlowCookie),
    joinFlowCookieValue: joinFlowCookie,
    hasJoinStateCookie: Boolean(joinStateCookie),
    hasRegularStateCookie: Boolean(regularStateCookie),
    cookiesReceived: request.cookies.getAll().map((c) => ({
      name: c.name,
      hasValue: Boolean(c.value),
    })),
    headers: {
      host: request.headers.get("host"),
      origin: request.headers.get("origin"),
      referer: request.headers.get("referer"),
      userAgent: request.headers.get("user-agent"),
    },
  });

  // If Zid returned an error, log it and redirect
  if (error) {
    console.error("[zid-oauth-callback] Zid returned error", {
      error,
      errorDescription,
    });
    return redirectWithStatus(config, "error", error);
  }

  if (!code || !state) {
    console.error("[zid-oauth-callback] missing code or state");
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

  console.info("[zid-oauth-callback] handleJoinFlow", {
    hasCookieState: Boolean(cookieState),
    statesMatch: cookieState === state,
  });

  if (!cookieState || cookieState !== state) {
    console.error("[zid-oauth-callback] state mismatch or missing", {
      hasCookieState: Boolean(cookieState),
      receivedState: state?.substring(0, 10) + "...",
    });
    return redirectWithStatus(config, "error");
  }
  const stateVerified = true;

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
    const errorText = await tokenResponse.text();
    console.error("[zid-oauth-callback] join flow token exchange failed", {
      status: tokenResponse.status,
      error: errorText,
    });
    return redirectWithStatus(config, "error");
  }

  const tokenData = (await tokenResponse.json()) as Record<string, unknown>;
  const { authorizationToken, managerToken, refreshToken, expiresIn } =
    extractZidTokens(tokenData);

  console.info("[zid-oauth-callback] join flow tokens received", {
    hasAuthToken: Boolean(authorizationToken),
    hasManagerToken: Boolean(managerToken),
    hasRefreshToken: Boolean(refreshToken),
  });
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
    console.info("[zid-oauth-callback] join flow profile fetched", {
      hasProfile: Boolean(profile),
      profileId: profile?.id,
      profileName: profile?.name,
    });
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
    console.error("[zid-oauth-callback] Failed to fetch Zid store info:", error);
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
    console.info("[zid-oauth-callback] existing merchant found, updating tokens", {
      merchantId: existingMerchant.id,
    });
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
    logZidOAuthSaved({
      merchantId: existingMerchant.id,
      storeId: zidStoreId,
      storeUrl,
      accessToken: authorizationToken,
      managerToken,
      refreshToken,
      stateVerified,
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

    console.info("[zid-oauth-callback] redirecting to integrations page");
    const response = NextResponse.redirect(
      `${config.appBaseUrl}/merchant/integrations?connected=zid`
    );
    response.cookies.set("raff_zid_join_state", "", { maxAge: 0, path: "/" });
    response.cookies.set("raff_zid_join_flow", "", { maxAge: 0, path: "/" });
    return response;
  }

  // Create new user and merchant with incomplete registration
  console.info("[zid-oauth-callback] creating new merchant", {
    email,
    storeName,
    hasStoreId: Boolean(zidStoreId),
  });
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
  console.info("[zid-oauth-callback] merchant created", {
    userId: user.id,
    merchantId: merchant.id,
  });
  logZidOAuthSaved({
    merchantId: merchant.id,
    storeId: zidStoreId,
    storeUrl,
    accessToken: authorizationToken,
    managerToken,
    refreshToken,
    stateVerified,
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

  const redirectUrl = `${config.appBaseUrl}/merchant/complete-registration?token=${registrationToken}`;
  console.info("[zid-oauth-callback] redirecting to complete registration", {
    redirectUrl,
  });

  // Redirect to complete registration page
  const response = NextResponse.redirect(redirectUrl);
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
  const stateVerified = true;

  const secret = process.env.NEXTAUTH_SECRET || config.clientSecret;
  const payload = verifyOAuthState<{ merchantId: string; platform?: string }>(
    state,
    secret
  );

  if (!payload?.merchantId) {
    return redirectWithStatus(config, "error");
  }
  if (payload.platform && payload.platform !== "zid") {
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
  logZidOAuthSaved({
    merchantId: payload.merchantId,
    storeId: zidStoreId,
    storeUrl,
    accessToken: authorizationToken,
    managerToken,
    refreshToken,
    stateVerified,
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
