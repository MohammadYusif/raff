// src/lib/platform/config.ts

type OptionalString = string | undefined | null;
type WebhookSignatureMode = "plain" | "sha256" | "hmac-sha256";

type WebhookConfig = {
  secret?: string;
  header?: string;
  signatureMode?: WebhookSignatureMode;
};

function requireEnv(name: string, fallback?: OptionalString): string {
  const value = process.env[name] || fallback;
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function requireHttpsUrl(name: string, value: string): string {
  if (process.env.NODE_ENV !== "production") {
    return value;
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`Invalid URL for ${name}`);
  }

  if (parsed.protocol !== "https:") {
    throw new Error(`${name} must use https in production`);
  }

  if (parsed.hostname === "localhost") {
    throw new Error(`${name} must not use localhost in production`);
  }

  return value;
}

function requireHttpsUrlIfProd(
  name: string,
  value: OptionalString
): OptionalString {
  if (!value) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Missing required env var: ${name}`);
    }
    return value;
  }
  return requireHttpsUrl(name, value);
}

function getOptionalHttpsUrl(name: string): OptionalString {
  const value = process.env[name];
  if (!value) return undefined;
  return requireHttpsUrl(name, value);
}

function getNextAuthUrl(): string {
  const value = requireEnv("NEXTAUTH_URL");
  return requireHttpsUrl("NEXTAUTH_URL", value);
}

function parseScopes(value: OptionalString): string[] {
  if (!value) return [];
  return value
    .split(/[,\s]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);
}

function parseList(value: OptionalString): string[] {
  if (!value) return [];
  return value
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getZidConfig() {
  getNextAuthUrl();
  const appBaseUrl = requireEnv(
    "ZID_APP_BASE_URL",
    getOptionalHttpsUrl("NEXT_PUBLIC_APP_URL")
  );
  const redirectUri = requireEnv(
    "ZID_REDIRECT_URI",
    process.env.ZID_OAUTH_REDIRECT_URI
  );
  requireHttpsUrl("ZID_APP_BASE_URL", appBaseUrl);
  requireHttpsUrl("ZID_REDIRECT_URI", redirectUri);

  const webhookCallbackUrl = requireHttpsUrlIfProd(
    "ZID_WEBHOOK_CALLBACK_URL",
    process.env.ZID_WEBHOOK_CALLBACK_URL
  );

  return {
    authUrl: requireEnv("ZID_AUTH_URL"),
    tokenUrl: requireEnv("ZID_TOKEN_URL"),
    apiBaseUrl: requireEnv("ZID_API_BASE_URL"),
    clientId: requireEnv("ZID_CLIENT_ID"),
    clientSecret: requireEnv("ZID_CLIENT_SECRET"),
    redirectUri,
    appBaseUrl,
    appId: process.env.ZID_APP_ID, // NEW: App ID for webhook registration
    scopes: parseScopes(process.env.ZID_SCOPES),
    webhook: {
      secret: process.env.ZID_WEBHOOK_SECRET,
      header: process.env.ZID_WEBHOOK_HEADER,
      createUrl:
        process.env.ZID_WEBHOOK_CREATE_URL ||
        "https://api.zid.sa/v1/managers/webhooks", // Default URL
      callbackUrl: webhookCallbackUrl,
      events: parseList(process.env.ZID_WEBHOOK_EVENTS),
    },
    productUrlTemplate: process.env.ZID_PRODUCT_URL_TEMPLATE,
  };
}

export function getSallaConfig() {
  getNextAuthUrl();
  const appBaseUrl = requireEnv(
    "SALLA_APP_BASE_URL",
    getOptionalHttpsUrl("NEXT_PUBLIC_APP_URL")
  );
  const redirectUri = requireEnv(
    "SALLA_REDIRECT_URI",
    process.env.SALLA_OAUTH_REDIRECT_URI
  );
  requireHttpsUrl("SALLA_APP_BASE_URL", appBaseUrl);
  requireHttpsUrl("SALLA_REDIRECT_URI", redirectUri);

  const webhookCallbackUrl = requireHttpsUrlIfProd(
    "SALLA_WEBHOOK_CALLBACK_URL",
    process.env.SALLA_WEBHOOK_CALLBACK_URL
  );

  return {
    authUrl: requireEnv("SALLA_AUTH_URL"),
    tokenUrl: requireEnv("SALLA_TOKEN_URL"),
    apiBaseUrl: requireEnv("SALLA_API_BASE_URL"),
    clientId: requireEnv("SALLA_CLIENT_ID"),
    clientSecret: requireEnv("SALLA_CLIENT_SECRET"),
    redirectUri,
    appBaseUrl,
    scopes: parseScopes(process.env.SALLA_SCOPES),
    webhook: {
      secret: process.env.SALLA_WEBHOOK_SECRET,
      header: (
        process.env.SALLA_WEBHOOK_HEADER || "x-salla-signature"
      ).toLowerCase(),
      signatureMode: (process.env.SALLA_WEBHOOK_SIGNATURE_MODE ||
        "hmac-sha256") as WebhookSignatureMode, // Official Salla method
      createUrl:
        process.env.SALLA_WEBHOOK_CREATE_URL ||
        "https://api.salla.dev/admin/v2/webhooks/subscribe", // Default URL
      callbackUrl: webhookCallbackUrl,
      events: parseList(process.env.SALLA_WEBHOOK_EVENTS),
      version: process.env.SALLA_WEBHOOK_VERSION || "2", // NEW: Webhook version
    },
    productUrlTemplate: process.env.SALLA_PRODUCT_URL_TEMPLATE,
    productsApiUrl: process.env.SALLA_PRODUCTS_API_URL,
    productApiUrlTemplate: process.env.SALLA_PRODUCT_API_URL_TEMPLATE,
    categoriesApiUrl: process.env.SALLA_CATEGORIES_API_URL,
  };
}

export function getZidWebhookConfig(): WebhookConfig {
  return {
    secret: process.env.ZID_WEBHOOK_SECRET,
    header: process.env.ZID_WEBHOOK_HEADER?.toLocaleLowerCase(),
    signatureMode:
      (process.env.ZID_WEBHOOK_SIGNATURE_MODE as WebhookSignatureMode) ??
      "plain",
  };
}

export function getSallaWebhookConfig(): WebhookConfig {
  return {
    secret: process.env.SALLA_WEBHOOK_SECRET,
    header: (
      process.env.SALLA_WEBHOOK_HEADER || "x-salla-signature"
    ).toLowerCase(),
    signatureMode:
      (process.env.SALLA_WEBHOOK_SIGNATURE_MODE as WebhookSignatureMode) ??
      "hmac-sha256",
  };
}
