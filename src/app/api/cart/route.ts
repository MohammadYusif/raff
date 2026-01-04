// src/app/api/cart/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserCartItems } from "@/lib/cart/server";

/**
 * GET /api/cart
 * Retrieve user's cart from database
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const items = await getUserCartItems(userId);

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Error fetching cart:", error);
    return NextResponse.json(
      { error: "Failed to fetch cart" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cart
 * Update user's cart in database
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { items } = body;

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: "Invalid items array" },
        { status: 400 }
      );
    }

    const itemsByProductId = new Map<string, number>();
    for (const item of items) {
      const productId = item && typeof item.id === "string" ? item.id : null;
      const quantity =
        item && typeof item.quantity === "number"
          ? item.quantity
          : Number(item?.quantity);

      if (!productId || !Number.isFinite(quantity) || quantity <= 0) {
        continue;
      }

      itemsByProductId.set(
        productId,
        (itemsByProductId.get(productId) ?? 0) + quantity
      );
    }

    await prisma.$transaction(async (tx) => {
      // Delete all existing cart items for this user
      await tx.cartItem.deleteMany({
        where: { userId },
      });

      // Insert new cart items
      if (itemsByProductId.size > 0) {
        await tx.cartItem.createMany({
          data: Array.from(itemsByProductId.entries()).map(
            ([productId, quantity]) => ({
              userId,
              productId,
              quantity,
            })
          ),
          skipDuplicates: true,
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating cart:", error);
    return NextResponse.json(
      { error: "Failed to update cart" },
      { status: 500 }
    );
  }
}
