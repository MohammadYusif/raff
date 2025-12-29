// src/types/merchant.ts
import { Merchant } from "@prisma/client";

/**
 * Merchant with product count
 */
export type MerchantWithCount = Merchant & {
  _count: {
    products: number;
  };
};

/**
 * Merchants list API response
 */
export interface MerchantsResponse {
  merchants: MerchantWithCount[];
}

/**
 * Single merchant API response
 */
export interface MerchantResponse {
  merchant: MerchantWithCount;
}
