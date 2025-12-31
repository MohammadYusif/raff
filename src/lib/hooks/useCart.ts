// src/lib/hooks/useCart.ts
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type CartItem = {
  id: string;
  slug: string;
  name: string; // Changed from "title" to match product naming
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

const CART_STORAGE_KEY = "raff_cart_v2"; // Updated version key
const CART_EVENT = "raff-cart-updated";

function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(Boolean)
      .map((item) => {
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

function writeCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(CART_EVENT));
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(readCart());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleUpdate = () => setItems(readCart());
    window.addEventListener("storage", handleUpdate);
    window.addEventListener(CART_EVENT, handleUpdate);

    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener(CART_EVENT, handleUpdate);
    };
  }, []);

  const updateItems = useCallback(
    (updater: (prev: CartItem[]) => CartItem[]) => {
      setItems((prev) => {
        const next = updater(prev);
        writeCart(next);
        return next;
      });
    },
    []
  );

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">, quantity: number = 1) => {
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
