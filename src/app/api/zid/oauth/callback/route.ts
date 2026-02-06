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
import { zidFetchManagerProfile } from "@/lib/services/zidApi";
import { createRegistrationToken } from "@/lib/registrationToken";
import { getZidRedirectUri } from "@/lib/zid/getZidRedirectUri";
import { isZidConnected } from "@/lib/zid/isZidConnected";
import { hasBearerPrefix, normalizeZidAuthorizationToken } from "@/lib/zid/tokens";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("api-zid-oauth-callback");


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

const LOG_BODY_LIMIT = 500;

const tokenPrefix = (value: string | null | undefined) =>
  value ? value.slice(0, 6) : null;

const getRawBodySnippet = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed) return "empty";
  return trimmed.length > LOG_BODY_LIMIT
    ? trimmed.slice(0, LOG_BODY_LIMIT)
    : trimmed;
};

const parseJsonRecord = (raw: string): Record<string, unknown> | null => {
  if (!raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const getTokenErrorDescription = (
  tokenData: Record<string, unknown> | null
): string | null => {
  if (!tokenData) return null;
  const message = tokenData.message;
  if (typeof message === "string") return message;
  if (isRecord(message)) {
    const description = message.description;
    if (typeof description === "string") return description;
    const nestedMessage = message.message;
    if (typeof nestedMessage === "string") return nestedMessage;
  }
  const error = tokenData.error;
  if (isRecord(error)) {
    const description = error.description;
    if (typeof description === "string") return description;
    const nestedMessage = error.message;
    if (typeof nestedMessage === "string") return nestedMessage;
  }
  return null;
};

const isTokenErrorPayload = (
  tokenData: Record<string, unknown> | null,
  raw: string
): boolean => {
  const status = tokenData?.status;
  const statusValue =
    typeof status === "string" ? status.toLowerCase() : null;
  if (statusValue === "error") return true;
  const description = getTokenErrorDescription(tokenData);
  if (description && description.toLowerCase().includes("invalid scope")) {
    return true;
  }
  return raw.toLowerCase().includes("invalid scope");
};

const readTokenResponse = async (response: Response) => {
  const raw = await response.text().catch(() => "");
  const tokenData = parseJsonRecord(raw);
  const errorDescription = getTokenErrorDescription(tokenData);
  const isErrorPayload = isTokenErrorPayload(tokenData, raw);
  return {
    raw,
    rawSnippet: getRawBodySnippet(raw),
    tokenData,
    errorDescription,
    isErrorPayload,
  };
};

const formatErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

const getTokenExchangeRedirectUri = (
  request: NextRequest,
  config: ReturnType<typeof getZidConfig>
) => {
  if (process.env.NODE_ENV === "production") {
    return config.redirectUri;
  }
  return config.redirectUri || getZidRedirectUri(request);
};

let didLogRedirectCheck = false;

const extractZidTokens = (tokenData: Record<string, unknown>) => {
  const rawAuthorizationToken =
    tokenString(tokenData.Authorization) ??
    tokenString(tokenData.authorization) ??
    tokenString(tokenData.authorization_token) ??
    tokenString(tokenData.authorizationToken);
  const authorizationToken = normalizeZidAuthorizationToken(rawAuthorizationToken);
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

  if (rawAuthorizationToken && authorizationToken && hasBearerPrefix(rawAuthorizationToken)) {
    console.info("[zid-oauth-callback] normalized authorization token", {
      rawPrefix: tokenPrefix(rawAuthorizationToken),
      normalizedPrefix: tokenPrefix(authorizationToken),
    });
  }

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
  const userAgent = request.headers.get("user-agent") || "";

  // TRIPWIRE: Log immediately to confirm endpoint is reached
  console.info("[zid-oauth-callback] TRIPWIRE - Endpoint hit", {
    timestamp: new Date().toISOString(),
    url: request.url,
    userAgent,
  });

  // Zid's server verification check (Ruby user agent, no browser)
  // Return 200 OK so Zid knows the endpoint is reachable
  if (userAgent.toLowerCase().includes("ruby") || (!userAgent && !request.nextUrl.searchParams.get("code"))) {
    console.info("[zid-oauth-callback] Zid server verification check - returning OK");
    return NextResponse.json({ status: "ok" });
  }

  const config = getZidConfig();
  if (!didLogRedirectCheck) {
    didLogRedirectCheck = true;
    const computedRedirectUri = getZidRedirectUri(request);
    if (computedRedirectUri !== config.redirectUri) {
      console.warn("[zid-oauth-callback] redirect URI mismatch", {
        configured: config.redirectUri,
        computed: computedRedirectUri,
      });
    } else {
      console.info("[zid-oauth-callback] redirect URI verified", {
        configured: config.redirectUri,
      });
    }
  }
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
    logger.error("[zid-oauth-callback] Zid returned error", {
      error,
      errorDescription,
    });
    return redirectWithStatus(config, "error", error);
  }

  // Handle join flow (new merchant registration) - doesn't require state
  if (isJoinFlow) {
    if (!code) {
      logger.error("[zid-oauth-callback] join flow missing code");
      return redirectWithStatus(config, "error");
    }
    try {
      return await handleJoinFlow(request, code, config);
    } catch (error) {
      logger.error("[zid-oauth-callback] join flow failed", {
        error: formatErrorMessage(error),
      });
      const errorCode =
        error instanceof Error && error.message === "zid_missing_tokens"
          ? "missing_tokens"
          : undefined;
      return redirectWithStatus(config, "error", errorCode);
    }
  }

  // Regular flow requires both code and state
  if (!code || !state) {
    logger.error("[zid-oauth-callback] missing code or state");
    return redirectWithStatus(config, "error");
  }

  // Handle regular flow (existing merchant connecting store)
  try {
    return await handleRegularFlow(request, code, state, config);
  } catch (error) {
    logger.error("[zid-oauth-callback] regular flow failed", {
      error: formatErrorMessage(error),
    });
    const errorCode =
      error instanceof Error && error.message === "zid_missing_tokens"
        ? "missing_tokens"
        : undefined;
    return redirectWithStatus(config, "error", errorCode);
  }
}

/**
 * Handle new merchant registration flow
 * Note: Join flow doesn't use state parameter since we follow Zid's simple OAuth example
 */
async function handleJoinFlow(
  request: NextRequest,
  code: string,
  config: ReturnType<typeof getZidConfig>
) {
  // Verify join flow cookie exists (our CSRF protection for join flow)
  const joinFlowCookie = request.cookies.get("raff_zid_join_flow")?.value;

  console.info("[zid-oauth-callback] handleJoinFlow", {
    hasJoinFlowCookie: Boolean(joinFlowCookie),
  });

  if (!joinFlowCookie) {
    logger.error("[zid-oauth-callback] join flow cookie missing");
    return redirectWithStatus(config, "error");
  }
  const stateVerified = true; // Cookie presence is our verification

  // Exchange code for tokens
  const tokenBody = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: getTokenExchangeRedirectUri(request, config),
  });

  const tokenResponse = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenBody,
  });

  const tokenResult = await readTokenResponse(tokenResponse);
  console.info("[zid-oauth-callback] token exchange", {
    status: tokenResponse.status,
    ok: tokenResponse.ok,
    errorDescription: tokenResult.errorDescription,
  });
  if (tokenResult.isErrorPayload) {
    logger.error("[zid-oauth-callback] token exchange returned error payload", {
      status: tokenResponse.status,
      errorDescription: tokenResult.errorDescription,
      raw: tokenResult.rawSnippet,
    });
    return redirectWithStatus(config, "error", "invalid_scopes");
  }
  if (!tokenResponse.ok || !tokenResult.tokenData) {
    logger.error("[zid-oauth-callback] join flow token exchange failed", {
      status: tokenResponse.status,
      error: tokenResult.rawSnippet,
    });
    return redirectWithStatus(config, "error");
  }

  const tokenData = tokenResult.tokenData;

  // Log the full token response to understand what Zid returns
  console.info("[zid-oauth-callback] token response keys", {
    keys: Object.keys(tokenData),
    hasStore: "store" in tokenData,
    hasStoreId: "store_id" in tokenData || "storeId" in tokenData,
    hasStoreUrl: "store_url" in tokenData || "storeUrl" in tokenData,
    storeData: tokenData.store ? Object.keys(tokenData.store as object) : null,
  });

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
    // Use zidFetchManagerProfile which doesn't require Store-Id
    const profileRaw = await zidFetchManagerProfile({
      id: "oauth-join",
      zidAccessToken: authorizationToken,
      zidManagerToken: managerToken,
      zidStoreId: null, // Not available yet
    });

    console.info("[zid-oauth-callback] join flow profile response", {
      hasResponse: Boolean(profileRaw),
      responseKeys: profileRaw && typeof profileRaw === 'object' ? Object.keys(profileRaw) : null,
    });

    if (profileRaw && typeof profileRaw === 'object') {
      const profileData = profileRaw as Record<string, unknown>;
      // Response might have manager or user or store object
      const profile =
        (profileData.manager as Record<string, unknown>) ||
        (profileData.user as Record<string, unknown>) ||
        (profileData.store as Record<string, unknown>) ||
        profileData;

      console.info("[zid-oauth-callback] join flow profile fetched", {
        hasProfile: Boolean(profile),
        profileKeys: profile ? Object.keys(profile) : null,
      });

      if (profile) {
        // Extract store info - it might be nested
        const store = (profile.store as Record<string, unknown>) || profile;
        const storeId = toStringOrNull(store.id) || toStringOrNull(profile.id);
        const profileName = toStringOrNull(profile.name) ||
          toStringOrNull(store.title as unknown) ||
          toStringOrNull(profile.title as unknown);
        const profileEmail = toStringOrNull(profile.email);
        const profileDomain = toStringOrNull(store.domain as unknown) ||
          toStringOrNull(store.url as unknown) ||
          toStringOrNull(profile.domain as unknown) ||
          toStringOrNull(profile.url as unknown);

        console.info("[zid-oauth-callback] extracted profile info", {
          storeId,
          profileName,
          profileEmail,
          profileDomain,
        });

        if (profileName) storeName = profileName;
        if (profileEmail) storeEmail = profileEmail;
        if (!zidStoreId && storeId) {
          zidStoreId = storeId;
        }
        if (profileDomain) {
          storeUrl = normalizeStoreUrl(profileDomain);
        }
      }
    }
  } catch (error) {
    logger.error("[zid-oauth-callback] failed to fetch Zid store info", {
      error: formatErrorMessage(error),
    });
  }

  // Generate email if not provided
  const email =
    storeEmail ||
    `zid-${zidStoreId || crypto.randomBytes(8).toString("hex")}@raff.merchants`;

  // Check if user/merchant already exists with this Zid store
  // Check both by storeId AND by store URL domain to catch store ID changes
  let existingMerchant = null;
  if (zidStoreId || storeUrl) {
    const whereConditions = [];
    if (zidStoreId) {
      whereConditions.push({ zidStoreId });
    }
    if (storeUrl) {
      try {
        const url = new URL(storeUrl);
        const domain = url.hostname;
        whereConditions.push({ zidStoreUrl: { contains: domain } });
      } catch {
        // Invalid URL, skip domain check
      }
    }

    if (whereConditions.length > 0) {
      existingMerchant = await prisma.merchant.findFirst({
        where: { OR: whereConditions },
        include: { user: true },
        orderBy: { createdAt: 'desc' }, // Get most recent if multiple
      });
    }
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
      logger.error("Zid webhook registration failed", { error: error instanceof Error ? error.message : String(error) });
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
    logger.error("[zid-oauth-callback] Zid webhook registration failed", {
      error: formatErrorMessage(error),
    });
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
    redirect_uri: getTokenExchangeRedirectUri(request, config),
  });

  const tokenResponse = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenBody,
  });

  const tokenResult = await readTokenResponse(tokenResponse);
  console.info("[zid-oauth-callback] token exchange", {
    status: tokenResponse.status,
    ok: tokenResponse.ok,
    errorDescription: tokenResult.errorDescription,
  });
  if (tokenResult.isErrorPayload) {
    logger.error("[zid-oauth-callback] token exchange returned error payload", {
      status: tokenResponse.status,
      errorDescription: tokenResult.errorDescription,
      raw: tokenResult.rawSnippet,
    });
    return redirectWithStatus(config, "error", "invalid_scopes");
  }
  if (!tokenResponse.ok || !tokenResult.tokenData) {
    logger.error("[zid-oauth-callback] token exchange failed", {
      status: tokenResponse.status,
      error: tokenResult.rawSnippet,
    });
    return redirectWithStatus(config, "error");
  }

  const tokenData = tokenResult.tokenData;
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
    // Use zidFetchManagerProfile which doesn't require Store-Id
    const profileRaw = await zidFetchManagerProfile({
      id: payload.merchantId,
      zidAccessToken: authorizationToken,
      zidManagerToken: managerToken,
      zidStoreId: null, // Not available yet
    });

    if (profileRaw && typeof profileRaw === 'object') {
      const profileData = profileRaw as Record<string, unknown>;
      const profile =
        (profileData.manager as Record<string, unknown>) ||
        (profileData.user as Record<string, unknown>) ||
        (profileData.store as Record<string, unknown>) ||
        profileData;

      if (profile) {
        const store = (profile.store as Record<string, unknown>) || profile;
        const storeId = toStringOrNull(store.id) || toStringOrNull(profile.id);
        const profileDomain = toStringOrNull(store.domain as unknown) ||
          toStringOrNull(store.url as unknown) ||
          toStringOrNull(profile.domain as unknown) ||
          toStringOrNull(profile.url as unknown);

        if (!zidStoreId && storeId) {
          zidStoreId = storeId;
        }
        if (profileDomain) {
          storeUrl = normalizeStoreUrl(profileDomain);
        }
      }
    }
  } catch (error) {
    logger.error("[zid-oauth-callback] failed to fetch Zid profile", {
      error: formatErrorMessage(error),
    });
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
    logger.error("[zid-oauth-callback] Zid webhook registration failed", {
      error: formatErrorMessage(error),
    });
  }

  const response = NextResponse.redirect(
    `${config.appBaseUrl}/merchant/integrations?connected=zid`
  );
  response.cookies.set("raff_zid_oauth_state", "", { maxAge: 0, path: "/" });
  return response;
}
