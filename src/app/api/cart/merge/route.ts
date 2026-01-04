// src/app/api/cart/merge/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/cart/merge
 * Merge guest cart (from session cookie) with user's database cart on login
 *
 * Merging strategy:
 * - If item exists in both carts, sum the quantities
 * - If item only in guest cart, add it to user cart
 * - Existing user cart items are preserved
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { guestCart } = body;

    if (!Array.isArray(guestCart)) {
      return NextResponse.json(
        { error: "Invalid guest cart" },
        { status: 400 }
      );
    }

    // If guest cart is empty, nothing to merge
    if (guestCart.length === 0) {
      return NextResponse.json({ success: true, merged: 0 });
    }

    const guestItemsByProductId = new Map<string, number>();
    for (const guestItem of guestCart) {
      const productId =
        guestItem && typeof guestItem.id === "string" ? guestItem.id : null;
      const quantity =
        guestItem && typeof guestItem.quantity === "number"
          ? guestItem.quantity
          : Number(guestItem?.quantity);

      if (!productId || !Number.isFinite(quantity) || quantity <= 0) {
        continue;
      }

      guestItemsByProductId.set(
        productId,
        (guestItemsByProductId.get(productId) ?? 0) + quantity
      );
    }

    if (guestItemsByProductId.size === 0) {
      return NextResponse.json({ success: true, merged: 0 });
    }

    // Get existing user cart items
    const existingCartItems = await prisma.cartItem.findMany({
      where: { userId },
    });

    // Create a map of existing items by productId
    const existingItemsMap = new Map(
      existingCartItems.map((item) => [item.productId, item])
    );

    // Prepare merge operations
    const itemsToCreate: Array<{
      userId: string;
      productId: string;
      quantity: number;
    }> = [];
    const itemsToUpdate: Array<{ id: string; quantity: number }> = [];

    for (const [productId, guestQuantity] of guestItemsByProductId.entries()) {
      const existingItem = existingItemsMap.get(productId);

      if (existingItem) {
        // Item exists in both carts - sum quantities
        itemsToUpdate.push({
          id: existingItem.id,
          quantity: existingItem.quantity + guestQuantity,
        });
      } else {
        // Item only in guest cart - add to user cart
        itemsToCreate.push({
          userId,
          productId,
          quantity: guestQuantity,
        });
      }
    }

    // Execute merge operations in a transaction
    await prisma.$transaction([
      // Create new items
      ...(itemsToCreate.length > 0
        ? [
            prisma.cartItem.createMany({
              data: itemsToCreate,
              skipDuplicates: true,
            }),
          ]
        : []),

      // Update existing items
      ...itemsToUpdate.map((item) =>
        prisma.cartItem.update({
          where: { id: item.id },
          data: { quantity: item.quantity },
        })
      ),
    ]);

    const mergedCount = itemsToCreate.length + itemsToUpdate.length;

    return NextResponse.json({
      success: true,
      merged: mergedCount,
      created: itemsToCreate.length,
      updated: itemsToUpdate.length,
    });
  } catch (error) {
    console.error("Error merging cart:", error);
    return NextResponse.json(
      { error: "Failed to merge cart" },
      { status: 500 }
    );
  }
}
