// src/lib/platform/config.ts

type OptionalString = string | undefined | null;

function requireEnv(name: string, fallback?: OptionalString): string {
  const value = process.env[name] || fallback;
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
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
  return {
    authUrl: requireEnv("ZID_AUTH_URL"),
    tokenUrl: requireEnv("ZID_TOKEN_URL"),
    apiBaseUrl: requireEnv("ZID_API_BASE_URL"),
    clientId: requireEnv("ZID_CLIENT_ID"),
    clientSecret: requireEnv("ZID_CLIENT_SECRET"),
    redirectUri: requireEnv(
      "ZID_REDIRECT_URI",
      process.env.ZID_OAUTH_REDIRECT_URI
    ),
    appBaseUrl: requireEnv("ZID_APP_BASE_URL", process.env.NEXT_PUBLIC_APP_URL),
    appId: process.env.ZID_APP_ID, // ✅ NEW: App ID for webhook registration
    scopes: parseScopes(process.env.ZID_SCOPES),
    webhook: {
      secret: process.env.ZID_WEBHOOK_SECRET,
      header: process.env.ZID_WEBHOOK_HEADER,
      createUrl:
        process.env.ZID_WEBHOOK_CREATE_URL ||
        "https://api.zid.sa/v1/managers/webhooks", // ✅ Default URL
      callbackUrl: process.env.ZID_WEBHOOK_CALLBACK_URL,
      events: parseList(process.env.ZID_WEBHOOK_EVENTS),
    },
    productUrlTemplate: process.env.ZID_PRODUCT_URL_TEMPLATE,
  };
}

export function getSallaConfig() {
  return {
    authUrl: requireEnv("SALLA_AUTH_URL"),
    tokenUrl: requireEnv("SALLA_TOKEN_URL"),
    apiBaseUrl: requireEnv("SALLA_API_BASE_URL"),
    clientId: requireEnv("SALLA_CLIENT_ID"),
    clientSecret: requireEnv("SALLA_CLIENT_SECRET"),
    redirectUri: requireEnv(
      "SALLA_REDIRECT_URI",
      process.env.SALLA_OAUTH_REDIRECT_URI
    ),
    appBaseUrl: requireEnv(
      "SALLA_APP_BASE_URL",
      process.env.NEXT_PUBLIC_APP_URL
    ),
    scopes: parseScopes(process.env.SALLA_SCOPES),
    webhook: {
      secret: process.env.SALLA_WEBHOOK_SECRET,
      header: process.env.SALLA_WEBHOOK_HEADER,
      createUrl:
        process.env.SALLA_WEBHOOK_CREATE_URL ||
        "https://api.salla.dev/admin/v2/webhooks/subscribe", // ✅ Default URL
      callbackUrl: process.env.SALLA_WEBHOOK_CALLBACK_URL,
      events: parseList(process.env.SALLA_WEBHOOK_EVENTS),
      version: process.env.SALLA_WEBHOOK_VERSION || "2", // ✅ NEW: Webhook version
    },
    productUrlTemplate: process.env.SALLA_PRODUCT_URL_TEMPLATE,
    productsApiUrl: process.env.SALLA_PRODUCTS_API_URL,
    productApiUrlTemplate: process.env.SALLA_PRODUCT_API_URL_TEMPLATE,
    categoriesApiUrl: process.env.SALLA_CATEGORIES_API_URL,
  };
}
