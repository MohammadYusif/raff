// src/lib/hooks/useCart.ts
"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useSession } from "next-auth/react";

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

const CART_EVENT = "raff-cart-updated";

function getStorageKey(userId?: string): string {
  return userId ? `raff_cart_${userId}` : "raff_cart_guest";
}

function readCart(userId?: string): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const storageKey = getStorageKey(userId);
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(Boolean).map((item) => {
      const slug =
        item && typeof item.slug === "string" ? item.slug : undefined;
      const fallbackUrl = slug ? `/products/${slug}` : "/products";
      const externalUrl =
        item && typeof item.externalUrl === "string" && item.externalUrl
          ? item.externalUrl
          : fallbackUrl;
      return { ...item, externalUrl } as CartItem;
    });
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[], userId?: string) {
  if (typeof window === "undefined") return;
  const storageKey = getStorageKey(userId);
  window.localStorage.setItem(storageKey, JSON.stringify(items));
  // Defer event dispatch to prevent render conflicts
  setTimeout(() => {
    window.dispatchEvent(new Event(CART_EVENT));
  }, 0);
}

// Migrate old guest cart to user-specific cart when user logs in
function migrateGuestCart(userId: string) {
  if (typeof window === "undefined") return;

  const guestCart = readCart(); // Read guest cart
  const userCart = readCart(userId); // Read user cart

  // If guest cart has items and user cart is empty, migrate
  if (guestCart.length > 0 && userCart.length === 0) {
    writeCart(guestCart, userId);
    // Clear guest cart after migration
    localStorage.removeItem("raff_cart_guest");
  }
}

export function useCart() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [items, setItems] = useState<CartItem[]>([]);
  const isAddingRef = useRef(false);
  const prevUserIdRef = useRef<string | undefined>();

  // Migrate guest cart when user logs in
  useEffect(() => {
    if (userId && userId !== prevUserIdRef.current) {
      migrateGuestCart(userId);
      prevUserIdRef.current = userId;
    }
  }, [userId]);

  useEffect(() => {
    setItems(readCart(userId));
  }, [userId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Defer updates to prevent "Cannot update during render" errors
    const handleUpdate = () => {
      setTimeout(() => {
        setItems(readCart(userId));
      }, 0);
    };

    window.addEventListener("storage", handleUpdate);
    window.addEventListener(CART_EVENT, handleUpdate);

    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener(CART_EVENT, handleUpdate);
    };
  }, [userId]);

  const updateItems = useCallback(
    (updater: (prev: CartItem[]) => CartItem[]) => {
      setItems((prev) => {
        const next = updater(prev);
        writeCart(next, userId);
        return next;
      });
    },
    [userId]
  );

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">, quantity: number = 1) => {
      // Prevent duplicate additions from rapid clicks
      if (isAddingRef.current) return;

      isAddingRef.current = true;

      updateItems((prev) => {
        const existing = prev.find((entry) => entry.id === item.id);
        if (existing) {
          return prev.map((entry) =>
            entry.id === item.id
              ? { ...entry, quantity: entry.quantity + quantity }
              : entry
          );
        }
        return [...prev, { ...item, quantity }];
      });

      // Reset flag after a short delay
      setTimeout(() => {
        isAddingRef.current = false;
      }, 300);
    },
    [updateItems]
  );

  const removeItem = useCallback(
    (id: string) => {
      updateItems((prev) => prev.filter((entry) => entry.id !== id));
    },
    [updateItems]
  );

  const updateQuantity = useCallback(
    (id: string, quantity: number) => {
      updateItems((prev) =>
        prev
          .map((entry) => (entry.id === id ? { ...entry, quantity } : entry))
          .filter((entry) => entry.quantity > 0)
      );
    },
    [updateItems]
  );

  const clearCart = useCallback(() => {
    updateItems(() => []);
  }, [updateItems]);

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  return {
    items,
    itemCount,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
  };
}
