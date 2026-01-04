// src/lib/cart/types.ts

export type CartItem = {
  id: string;
  slug: string;
  name: string;
  nameAr?: string | null;
  image?: string | null;
  price: number;
  currency: string;
  quantity: number;
  merchantName: string;
  merchantNameAr?: string | null;
  categoryName?: string | null;
  categoryNameAr?: string | null;
  externalUrl: string;
  trendingScore?: number | null;
};
