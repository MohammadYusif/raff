// src/lib/integrations/salla/store.ts
import { fetchWithTimeout } from "@/lib/platform/fetch";

export type SallaStoreInfo = {
  id: number;
  name: string;
  entity: "company" | "individual";
  email: string;
  avatar: string;
  plan: string;
  type: "demo" | "live";
  status: "active" | "inactive";
  verified: boolean;
  currency: string;
  domain: string;
  description: string;
  licenses?: {
    tax_number?: string;
    commercial_number?: string;
    freelance_number?: string;
  };
  social?: Record<string, string | undefined>;
};

type SallaStoreEnvelope = {
  status?: number;
  success?: boolean;
  data?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export async function fetchSallaStoreInfo(
  token: string
): Promise<SallaStoreInfo> {
  const response = await fetchWithTimeout(
    "https://api.salla.dev/admin/v2/store/info",
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    }
  );

  const bodyText = await response.text();
  let parsed: unknown;

  try {
    parsed = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    throw new Error(
      `Salla store info invalid JSON (${response.status}): ${bodyText || "empty"}`
    );
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error("Salla token invalid or expired");
  }

  if (!response.ok) {
    throw new Error(
      `Salla store info failed (${response.status}): ${bodyText || "empty"}`
    );
  }

  if (!isRecord(parsed)) {
    throw new Error(`Salla store info invalid response: ${bodyText || "empty"}`);
  }

  const envelope = parsed as SallaStoreEnvelope;
  if (envelope.success !== true || !envelope.data) {
    throw new Error(`Salla store info error: ${bodyText || "empty"}`);
  }

  if (!isRecord(envelope.data)) {
    throw new Error("Salla store info data is not an object");
  }

  return envelope.data as SallaStoreInfo;
}
