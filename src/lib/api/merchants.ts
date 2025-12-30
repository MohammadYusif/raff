// src/lib/api/merchants.ts
import type { MerchantsResponse, MerchantResponse } from "@/types";

// ✅ FIX: Use proper environment variable check
function getApiBaseUrl(): string {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  }
  return "";
}

const API_BASE_URL = getApiBaseUrl();

export async function fetchMerchants(): Promise<MerchantsResponse> {
  const url = `${API_BASE_URL}/api/merchants`;

  const response = await fetch(url, {
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch merchants");
  }

  return response.json();
}

export async function fetchMerchant(id: string): Promise<MerchantResponse> {
  const url = `${API_BASE_URL}/api/merchants/${id}`;

  const response = await fetch(url, {
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Merchant not found");
    }
    throw new Error("Failed to fetch merchant");
  }

  return response.json();
}
