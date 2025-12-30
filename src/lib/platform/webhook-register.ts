// src/lib/platform/webhook-register.ts
import { getSallaConfig, getZidConfig } from "@/lib/platform/config";

type RegisterResult =
  | { status: "skipped"; reason: string }
  | { status: "registered"; response: unknown };

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
    throw new Error(`Webhook registration failed: ${response.status}`);
  }

  return response.json();
}

export async function registerZidWebhooks(params: {
  accessToken: string;
  managerToken?: string | null;
}): Promise<RegisterResult> {
  const config = getZidConfig();
  const callbackUrl =
    config.webhook.callbackUrl || `${config.appBaseUrl}/api/zid/webhook`;

  if (!config.webhook.createUrl) {
    return { status: "skipped", reason: "Missing ZID_WEBHOOK_CREATE_URL" };
  }

  if (!config.webhook.secret || !config.webhook.header) {
    return { status: "skipped", reason: "Missing Zid webhook secret/header" };
  }

  if (!config.webhook.events.length) {
    return { status: "skipped", reason: "Missing ZID_WEBHOOK_EVENTS" };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${params.accessToken}`,
    Accept: "application/json",
  };

  if (params.managerToken) {
    headers["X-MANAGER-TOKEN"] = params.managerToken;
  }

  // TODO: Adjust payload format to Zid webhook registration schema.
  const payload = {
    url: callbackUrl,
    events: config.webhook.events,
    headers: {
      [config.webhook.header]: config.webhook.secret,
    },
  };

  try {
    const response = await postJson(config.webhook.createUrl, headers, payload);
    return { status: "registered", response };
  } catch (error) {
    console.error("Zid webhook registration failed:", error);
    const message =
      error instanceof Error ? error.message : "Unknown registration error";
    return { status: "skipped", reason: message };
  }
}

export async function registerSallaWebhooks(params: {
  accessToken: string;
}): Promise<RegisterResult> {
  const config = getSallaConfig();
  const callbackUrl =
    config.webhook.callbackUrl || `${config.appBaseUrl}/api/salla/webhook`;

  if (!config.webhook.createUrl) {
    return { status: "skipped", reason: "Missing SALLA_WEBHOOK_CREATE_URL" };
  }

  if (!config.webhook.secret || !config.webhook.header) {
    return { status: "skipped", reason: "Missing Salla webhook secret/header" };
  }

  if (!config.webhook.events.length) {
    return { status: "skipped", reason: "Missing SALLA_WEBHOOK_EVENTS" };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${params.accessToken}`,
    Accept: "application/json",
  };

  // TODO: Adjust payload format to Salla webhook registration schema.
  const payload = {
    url: callbackUrl,
    events: config.webhook.events,
    headers: {
      [config.webhook.header]: config.webhook.secret,
    },
  };

  try {
    const response = await postJson(config.webhook.createUrl, headers, payload);
    return { status: "registered", response };
  } catch (error) {
    console.error("Salla webhook registration failed:", error);
    const message =
      error instanceof Error ? error.message : "Unknown registration error";
    return { status: "skipped", reason: message };
  }
}
