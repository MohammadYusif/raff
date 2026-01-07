// src/lib/platform/webhook-register.ts
import { getSallaConfig, getZidConfig } from "@/lib/platform/config";

type RegisterResult =
  | { status: "skipped"; reason: string }
  | { status: "registered"; webhooksCreated: number; response?: unknown }
  | { status: "partial"; webhooksCreated: number; errors: string[] };

function appendTokenToUrl(url: string, token?: string): string {
  if (!token) return url;
  const parsed = new URL(url);
  parsed.searchParams.set("token", token);
  return parsed.toString();
}

async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown
) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Webhook registration failed: ${response.status} - ${text}`
    );
  }

  return response.json();
}

const SALLA_SUPPORTED_EVENTS = new Set([
  "product.created",
  "product.updated",
  "product.deleted",
  "order.created",
  "order.updated",
  "order.status.updated",
  "order.cancelled",
  "order.refunded",
]);

function sanitizeSallaEvents(events: string[]): string[] {
  const uniqueEvents = Array.from(new Set(events));
  const supportedEvents = uniqueEvents.filter((event) =>
    SALLA_SUPPORTED_EVENTS.has(event)
  );
  const unsupportedEvents = uniqueEvents.filter(
    (event) => !SALLA_SUPPORTED_EVENTS.has(event)
  );

  if (unsupportedEvents.length > 0) {
    console.warn(
      `Skipping unsupported Salla webhook events: ${unsupportedEvents.join(", ")}`
    );
  }

  return supportedEvents;
}

/**
 * Register Zid webhooks
 * Note: Zid only accepts ONE event per webhook, so we register multiple
 */
export async function registerZidWebhooks(params: {
  accessToken: string;
  managerToken?: string | null;
}): Promise<RegisterResult> {
  const config = getZidConfig();
  const callbackUrl = appendTokenToUrl(
    config.webhook.callbackUrl || `${config.appBaseUrl}/api/zid/webhook`,
    process.env.ZID_WEBHOOK_TOKEN
  );

  // Validation
  if (!config.webhook.createUrl) {
    return { status: "skipped", reason: "Missing ZID_WEBHOOK_CREATE_URL" };
  }

  if (!config.webhook.secret || !config.webhook.header) {
    return { status: "skipped", reason: "Missing Zid webhook secret/header" };
  }

  if (!config.webhook.events.length) {
    return { status: "skipped", reason: "Missing ZID_WEBHOOK_EVENTS" };
  }

  if (!config.appId) {
    return { status: "skipped", reason: "Missing ZID_APP_ID" };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${params.accessToken}`,
    Accept: "application/json",
  };

  if (params.managerToken) {
    headers["X-Manager-Token"] = params.managerToken;
    headers.Role = "Manager";
  }

  // Register one webhook per event
  const results: Array<{ event: string; success: boolean; error?: string }> =
    [];

  for (const event of config.webhook.events) {
    const payload = {
      event, // Single event
      target_url: callbackUrl,
      original_id: config.appId,
      subscriber: config.appId,
      // Optional: Add conditions if needed
      // conditions: {}
    };

    try {
      await postJson(config.webhook.createUrl, headers, payload);
      results.push({ event, success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`Zid webhook registration failed for ${event}:`, message);
      results.push({ event, success: false, error: message });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const failures = results.filter((r) => !r.success);

  if (successCount === 0) {
    return {
      status: "skipped",
      reason: `All webhook registrations failed: ${failures.map((f) => f.error).join(", ")}`,
    };
  }

  if (failures.length > 0) {
    return {
      status: "partial",
      webhooksCreated: successCount,
      errors: failures.map((f) => `${f.event}: ${f.error}`),
    };
  }

  return {
    status: "registered",
    webhooksCreated: successCount,
  };
}

/**
 * Register Salla webhooks
 * Note: Salla only accepts ONE event per webhook, so we register multiple
 */
export async function registerSallaWebhooks(params: {
  accessToken: string;
}): Promise<RegisterResult> {
  const config = getSallaConfig();
  const callbackUrl =
    config.webhook.callbackUrl || `${config.appBaseUrl}/api/salla/webhook`;

  // Validation
  if (!config.webhook.createUrl) {
    return { status: "skipped", reason: "Missing SALLA_WEBHOOK_CREATE_URL" };
  }

  if (!config.webhook.secret || !config.webhook.header) {
    return { status: "skipped", reason: "Missing Salla webhook secret/header" };
  }

  if (!config.webhook.events.length) {
    return { status: "skipped", reason: "Missing SALLA_WEBHOOK_EVENTS" };
  }

  const events = sanitizeSallaEvents(config.webhook.events);
  if (!events.length) {
    return {
      status: "skipped",
      reason: "No supported Salla webhook events configured",
    };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${params.accessToken}`,
    Accept: "application/json",
  };

  const version = parseInt(config.webhook.version || "2", 10);

  // Register one webhook per event
  const results: Array<{ event: string; success: boolean; error?: string }> =
    [];

  for (const event of events) {
    const payload = {
      name: `Raff - ${event}`,
      event, // Single event
      url: callbackUrl,
      version,
      headers: [
        {
          key: config.webhook.header,
          value: config.webhook.secret,
        },
      ],
      // Optional: Add rule for filtering
      // rule: "price > 100"
    };

    try {
      await postJson(config.webhook.createUrl, headers, payload);
      results.push({ event, success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`Salla webhook registration failed for ${event}:`, message);
      results.push({ event, success: false, error: message });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const failures = results.filter((r) => !r.success);

  if (successCount === 0) {
    return {
      status: "skipped",
      reason: `All webhook registrations failed: ${failures.map((f) => f.error).join(", ")}`,
    };
  }

  if (failures.length > 0) {
    return {
      status: "partial",
      webhooksCreated: successCount,
      errors: failures.map((f) => `${f.event}: ${f.error}`),
    };
  }

  return {
    status: "registered",
    webhooksCreated: successCount,
  };
}
