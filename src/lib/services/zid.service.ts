// src/lib/services/zid.service.ts
// PURPOSE: Zid auth utilities and token refresh

import { prisma } from "@/lib/prisma";
import { getZidConfig } from "@/lib/platform/config";
import { fetchWithTimeout } from "@/lib/platform/fetch";

type ZidConfig = {
  accessToken: string;
  storeId?: string | null;
  managerToken?: string | null;
};

export type ZidMerchantAuth = {
  id: string;
  zidAccessToken: string | null;
  zidRefreshToken: string | null;
  zidTokenExpiry: Date | null;
  zidManagerToken: string | null;
  zidStoreId: string | null;
  zidStoreUrl: string | null;
};

export type ZidTokenState = {
  authorizationToken: string | null;
  managerToken: string | null;
  refreshToken: string | null;
  tokenExpiry: Date | null;
};

export class ZidService {
  private baseUrl: string;
  private accessToken: string;
  private storeId?: string | null;
  private managerToken?: string | null;

  constructor(config: ZidConfig) {
    const zidConfig = getZidConfig();
    this.baseUrl = zidConfig.apiBaseUrl;
    this.accessToken = config.accessToken;
    this.storeId = config.storeId;
    this.managerToken = config.managerToken;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    if (this.storeId) {
      headers["Store-Id"] = String(this.storeId);
    }

    if (this.managerToken) {
      headers["X-Manager-Token"] = this.managerToken;
      headers.Role = "Manager";
    }

    return headers;
  }

  /**
   * Fetch store manager profile
   */
  async fetchStoreProfile(): Promise<{
    id: string;
    name: string;
    email: string;
    domain: string;
  } | null> {
    const response = await fetchWithTimeout(
      `${this.baseUrl}/managers/account/profile`,
      {
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Zid API error: ${response.status}`);
    }

    const data = await response.json();
    return data.manager || null;
  }

  /**
   * Refresh access token
   */
  static async refreshToken(refreshToken: string): Promise<{
    authorizationToken: string | null;
    managerToken: string | null;
    refreshToken: string | null;
    expiresIn: number;
  }> {
    const zidConfig = getZidConfig();
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: zidConfig.clientId,
      client_secret: zidConfig.clientSecret,
    });

    const response = await fetchWithTimeout(zidConfig.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    const data = await response.json();
    const expiresRaw = data.expires_in;
    const expiresIn =
      typeof expiresRaw === "number"
        ? expiresRaw
        : typeof expiresRaw === "string"
        ? Number(expiresRaw)
        : null;

    const expiresInValue =
      typeof expiresIn === "number" && Number.isFinite(expiresIn)
        ? expiresIn
        : 0;

    return {
      authorizationToken:
        data.authorization ||
        data.Authorization ||
        data.authorization_token ||
        data.authorizationToken ||
        null,
      managerToken: data.access_token || data.accessToken || null,
      refreshToken: data.refresh_token || data.refreshToken || null,
      expiresIn: expiresInValue,
    };
  }
}

function isTokenExpired(tokenExpiry: Date | null): boolean {
  if (!tokenExpiry) return false;
  return tokenExpiry.getTime() <= Date.now();
}

export async function ensureZidAccessToken(merchant: ZidMerchantAuth) {
  if (!isTokenExpired(merchant.zidTokenExpiry)) {
    return {
      authorizationToken: merchant.zidAccessToken,
      managerToken: merchant.zidManagerToken,
      refreshToken: merchant.zidRefreshToken,
      tokenExpiry: merchant.zidTokenExpiry,
    };
  }

  if (!merchant.zidRefreshToken) {
    throw new Error("Zid refresh token missing");
  }

  const refreshed = await ZidService.refreshToken(merchant.zidRefreshToken);
  const tokenExpiry = new Date(Date.now() + refreshed.expiresIn * 1000);
  const authorizationToken =
    refreshed.authorizationToken ?? merchant.zidAccessToken;
  const managerToken = refreshed.managerToken ?? merchant.zidManagerToken;
  const refreshToken = refreshed.refreshToken ?? merchant.zidRefreshToken;

  await prisma.merchant.update({
    where: { id: merchant.id },
    data: {
      zidAccessToken: authorizationToken,
      zidManagerToken: managerToken,
      zidRefreshToken: refreshToken,
      zidTokenExpiry: tokenExpiry,
    },
  });

  return {
    authorizationToken,
    managerToken,
    refreshToken,
    tokenExpiry,
  };
}

export async function deactivateZidProduct(
  merchantId: string,
  zidProductId: string
): Promise<void> {
  await prisma.product.updateMany({
    where: {
      merchantId,
      zidProductId,
    },
    data: {
      isActive: false,
      inStock: false,
    },
  });
}
