// src/lib/cart/server.ts

import { prisma } from "@/lib/prisma";
import { addCartFields } from "@/lib/products/cart";
import type { CartItem } from "@/lib/cart/types";

export async function getUserCartItems(userId: string): Promise<CartItem[]> {
  const cartItems = await prisma.cartItem.findMany({
    where: { userId },
    select: {
      quantity: true,
      product: {
        select: {
          id: true,
          slug: true,
          title: true,
          titleAr: true,
          price: true,
          currency: true,
          thumbnail: true,
          images: true,
          externalProductUrl: true,
          sallaUrl: true,
          zidProductId: true,
          sallaProductId: true,
          trendingScore: true,
          merchant: {
            select: {
              name: true,
              nameAr: true,
              zidStoreUrl: true,
              sallaStoreUrl: true,
            },
          },
          category: {
            select: {
              name: true,
              nameAr: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return cartItems.map((item) => {
    const product = addCartFields(item.product);
    return {
      id: product.id,
      slug: product.slug,
      name: product.title,
      nameAr: product.titleAr,
      image: product.imageUrl,
      price: Number(product.price),
      currency: product.currency,
      quantity: item.quantity,
      merchantName: product.merchant.name,
      merchantNameAr: product.merchant.nameAr,
      categoryName: product.category?.name ?? null,
      categoryNameAr: product.category?.nameAr ?? null,
      externalUrl: product.externalUrl,
      trendingScore: product.trendingScore,
    };
  });
}
