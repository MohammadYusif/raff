// src/lib/zid/isZidConnected.ts
import type { Merchant } from "@prisma/client";

export type ZidConnectionFields = Pick<
  Merchant,
  "zidStoreId" | "zidStoreUrl" | "zidAccessToken" | "zidManagerToken"
>;

type ZidConnectionOptions = {
  requireStoreUrl?: boolean;
};

export const getMissingZidConnectionFields = (
  merchant: ZidConnectionFields,
  options?: ZidConnectionOptions
): string[] => {
  const requireStoreUrl = options?.requireStoreUrl ?? true;
  const missing: string[] = [];

  if (!merchant.zidAccessToken) {
    missing.push("zidAccessToken");
  }
  if (!merchant.zidManagerToken) {
    missing.push("zidManagerToken");
  }
  if (!merchant.zidStoreId) {
    missing.push("zidStoreId");
  }
  if (requireStoreUrl && !merchant.zidStoreUrl) {
    missing.push("zidStoreUrl");
  }

  if (missing.length > 0 && process.env.RAFF_SYNC_DEBUG === "true") {
    console.debug("[zid] missing connection fields", { missing });
  }

  return missing;
};

export const isZidConnected = (
  merchant: ZidConnectionFields,
  options?: ZidConnectionOptions
): boolean => getMissingZidConnectionFields(merchant, options).length === 0;
