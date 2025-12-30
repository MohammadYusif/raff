// src/types/merchant.ts
import { Merchant } from "@prisma/client";

/**
 * Merchant with product count
 */
export type PublicMerchant = Pick<
  Merchant,
  | "id"
  | "name"
  | "nameAr"
  | "description"
  | "descriptionAr"
  | "logo"
  | "sallaStoreUrl"
  | "zidStoreUrl"
> &
  Partial<Pick<Merchant, "phone" | "email">>;

export type MerchantWithCount = PublicMerchant & {
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
