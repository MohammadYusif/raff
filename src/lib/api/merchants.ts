// src/lib/api/merchants.ts
import type { MerchantsResponse, MerchantResponse } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Fetch all merchants
 */
export async function fetchMerchants(): Promise<MerchantsResponse> {
  const url = `${API_BASE_URL}/api/merchants`;

  const response = await fetch(url, {
    next: { revalidate: 3600 }, // Cache for 1 hour
  });

  if (!response.ok) {
    throw new Error("Failed to fetch merchants");
  }

  return response.json();
}

/**
 * Fetch single merchant by ID
 */
export async function fetchMerchant(id: string): Promise<MerchantResponse> {
  const url = `${API_BASE_URL}/api/merchants/${id}`;

  const response = await fetch(url, {
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Merchant not found");
    }
    throw new Error("Failed to fetch merchant");
  }

  return response.json();
}
