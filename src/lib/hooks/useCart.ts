// src/lib/hooks/useCart.ts
"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import type { CartItem } from "@/lib/cart/types";

export type { CartItem } from "@/lib/cart/types";

const CART_EVENT = "raff-cart-updated";
const GUEST_CART_STORAGE_KEY = "raff_guest_cart";
const GUEST_CART_MERGE_LOCK_KEY = "raff_guest_cart_merge_lock";
const USER_CART_WRITE_DEBOUNCE_MS = 300;

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  isLoading: boolean;
  addItem: (
    item: Omit<CartItem, "quantity">,
    quantity?: number
  ) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  updateQuantity: (id: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
};

type CartStateOptions = {
  initialItems?: CartItem[];
  initialUserId?: string;
};

const CartContext = createContext<CartContextValue | null>(null);

function areCartItemsEqual(a: CartItem[], b: CartItem[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;

  for (let index = 0; index < a.length; index += 1) {
    const left = a[index];
    const right = b[index];

    if (
      left.id !== right.id ||
      left.slug !== right.slug ||
      left.name !== right.name ||
      left.nameAr !== right.nameAr ||
      left.image !== right.image ||
      left.price !== right.price ||
      left.currency !== right.currency ||
      left.quantity !== right.quantity ||
      left.merchantName !== right.merchantName ||
      left.merchantNameAr !== right.merchantNameAr ||
      left.categoryName !== right.categoryName ||
      left.categoryNameAr !== right.categoryNameAr ||
      left.externalUrl !== right.externalUrl ||
      left.trendingScore !== right.trendingScore
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Read cart from sessionStorage (for guest users)
 * sessionStorage is per-tab and cleared when the tab closes
 */
function readGuestCart(): CartItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = sessionStorage.getItem(GUEST_CART_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(Boolean).map((item) => {
      const slug =
        item && typeof item.slug === "string" ? item.slug : undefined;
      const fallbackUrl = slug
        ? `/products/${encodeURIComponent(slug)}`
        : "/products";
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

/**
 * Write cart to sessionStorage (for guest users)
 * sessionStorage automatically clears when the tab closes
 */
function writeGuestCart(items: CartItem[]) {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(items));

    // Dispatch event for cross-component updates
    setTimeout(() => {
      window.dispatchEvent(new Event(CART_EVENT));
    }, 0);
  } catch (error) {
    console.error("Failed to write guest cart:", error);
  }
}

function clearGuestCart() {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.removeItem(GUEST_CART_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear guest cart:", error);
  }
}

function acquireMergeLock(userId: string): boolean {
  if (typeof window === "undefined") return false;

  try {
    const existing = sessionStorage.getItem(GUEST_CART_MERGE_LOCK_KEY);
    if (existing) return false;

    sessionStorage.setItem(
      GUEST_CART_MERGE_LOCK_KEY,
      JSON.stringify({ userId, ts: Date.now() })
    );
    return true;
  } catch {
    return true;
  }
}

function releaseMergeLock() {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.removeItem(GUEST_CART_MERGE_LOCK_KEY);
  } catch {
    // Ignore lock cleanup failures
  }
}

/**
 * Read cart from database (for logged-in users)
 * This fetches from the API
 */
async function readUserCart(signal?: AbortSignal): Promise<CartItem[] | null> {
  try {
    const response = await fetch("/api/cart", {
      credentials: "include",
      signal,
    });
    if (!response.ok) return [];

    const data = await response.json();
    return Array.isArray(data.items) ? data.items : [];
  } catch (error) {
    if ((error as Error).name === "AbortError") return null;
    return [];
  }
}

/**
 * Write cart to database (for logged-in users)
 */
async function writeUserCart(items: CartItem[]) {
  try {
    const response = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ items }),
    });
    if (!response.ok) {
      console.error("Failed to write user cart:", response.status);
      return;
    }

    // Dispatch event for cross-component updates
    setTimeout(() => {
      window.dispatchEvent(new Event(CART_EVENT));
    }, 0);
  } catch (error) {
    console.error("Failed to write user cart:", error);
  }
}

/**
 * Merge guest cart with user cart and clear guest storage
 */
async function mergeGuestCartToUser(userId: string): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const guestCart = readGuestCart();
  if (guestCart.length === 0) return false;

  if (!acquireMergeLock(userId)) return false;

  try {
    // Call API to merge carts
    const response = await fetch("/api/cart/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ guestCart }),
    });
    if (!response.ok) {
      console.error("Failed to merge guest cart:", response.status);
      return false;
    }

    // Clear guest cart storage after successful merge
    clearGuestCart();

    // Dispatch update event
    setTimeout(() => {
      window.dispatchEvent(new Event(CART_EVENT));
    }, 0);
    return true;
  } catch (error) {
    console.error("Failed to merge guest cart:", error);
    return false;
  } finally {
    releaseMergeLock();
  }
}

function useCartState(options: CartStateOptions = {}): CartContextValue {
  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  const hasInitialSnapshot = Boolean(options.initialUserId);
  const initialItemsRef = useRef<CartItem[]>(
    hasInitialSnapshot ? options.initialItems ?? [] : []
  );
  const initialUserIdRef = useRef<string | undefined>(options.initialUserId);
  const [items, setItems] = useState<CartItem[]>(() => initialItemsRef.current);
  const [isLoading, setIsLoading] = useState(!hasInitialSnapshot);
  const isAddingRef = useRef(false);
  const prevUserIdRef = useRef<string | undefined>(undefined);
  const prevStatusRef = useRef<
    "loading" | "authenticated" | "unauthenticated" | undefined
  >(undefined);
  const userCartCacheRef = useRef<CartItem[] | null>(null);
  const userCartLastFetchRef = useRef(0);
  const userCartInFlightRef = useRef<Promise<CartItem[]> | null>(null);
  const userCartAbortRef = useRef<AbortController | null>(null);
  const userCartRequestIdRef = useRef(0);
  const pendingWriteRef = useRef<CartItem[] | null>(null);
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const writeEpochRef = useRef(0);
  const writeTimerRef = useRef<number | null>(null);
  const authRef = useRef<{
    userId: string | undefined;
    status: "loading" | "authenticated" | "unauthenticated";
  }>({ userId, status });

  useEffect(() => {
    authRef.current = { userId, status };
  }, [userId, status]);

  const fetchUserCart = useCallback(
    (force: boolean = false) => {
      if (!userId) return Promise.resolve<CartItem[]>([]);

      const now = Date.now();
      const cache = userCartCacheRef.current;
      if (
        !force &&
        cache &&
        now - userCartLastFetchRef.current < 1500
      ) {
        return Promise.resolve(cache);
      }

      if (force && userCartAbortRef.current) {
        userCartAbortRef.current.abort();
        userCartAbortRef.current = null;
        userCartInFlightRef.current = null;
      }

      if (userCartInFlightRef.current) {
        return userCartInFlightRef.current;
      }

      const requestId = (userCartRequestIdRef.current += 1);
      const controller = new AbortController();
      userCartAbortRef.current = controller;

      const request = readUserCart(controller.signal)
        .then((next) => {
          if (requestId !== userCartRequestIdRef.current) {
            return userCartCacheRef.current ?? [];
          }
          if (next !== null) {
            userCartCacheRef.current = next;
            userCartLastFetchRef.current = Date.now();
            return next;
          }
          return userCartCacheRef.current ?? [];
        })
        .finally(() => {
          if (userCartAbortRef.current === controller) {
            userCartAbortRef.current = null;
          }
          userCartInFlightRef.current = null;
        });

      userCartInFlightRef.current = request;
      return request;
    },
    [userId]
  );

  useEffect(() => {
    if (userCartAbortRef.current) {
      userCartAbortRef.current.abort();
      userCartAbortRef.current = null;
    }
    userCartCacheRef.current = null;
    userCartLastFetchRef.current = 0;
    userCartInFlightRef.current = null;
    userCartRequestIdRef.current += 1;
    pendingWriteRef.current = null;
    writeQueueRef.current = Promise.resolve();
    writeEpochRef.current += 1;
    if (writeTimerRef.current) {
      window.clearTimeout(writeTimerRef.current);
      writeTimerRef.current = null;
    }
  }, [userId]);

  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    if (prevStatus === "authenticated" && status === "unauthenticated") {
      clearGuestCart();
      setItems((prev) => (areCartItemsEqual(prev, []) ? prev : []));
      prevUserIdRef.current = undefined;
    }
    prevStatusRef.current = status;
  }, [status]);

  // Prefill from sessionStorage immediately so guests don't see empty cart
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (initialUserIdRef.current) return;
    const guestCart = readGuestCart();
    if (guestCart.length > 0) {
      setItems((prev) => (areCartItemsEqual(prev, guestCart) ? prev : guestCart));
    }
  }, []);

  // Merge guest cart when user logs in
  useEffect(() => {
    if (
      userId &&
      userId !== prevUserIdRef.current &&
      status === "authenticated"
    ) {
      mergeGuestCartToUser(userId).then((merged) => {
        if (merged) {
          fetchUserCart(true).then((next) => {
            setItems((prev) => (areCartItemsEqual(prev, next) ? prev : next));
          });
        }
      });
      prevUserIdRef.current = userId;
    }
  }, [userId, status, fetchUserCart]);

  // Initialize cart on mount
  useEffect(() => {
    if (status === "loading") return;

    const hasInitialSnapshotForUser =
      status === "authenticated" &&
      initialUserIdRef.current &&
      initialUserIdRef.current === userId;

    const initializeCart = async () => {
      if (userId && status === "authenticated") {
        if (hasInitialSnapshotForUser) {
          fetchUserCart(true).then((next) => {
            setItems((prev) => (areCartItemsEqual(prev, next) ? prev : next));
          });
        } else {
          setIsLoading(true);
          const guestCart = readGuestCart();
          if (guestCart.length > 0) {
            setItems((prev) => (areCartItemsEqual(prev, guestCart) ? prev : guestCart));
          } else {
            // Load from database for logged-in users
            const userCart = await fetchUserCart(true);
            setItems((prev) =>
              areCartItemsEqual(prev, userCart) ? prev : userCart
            );
          }
        }
      } else {
        setIsLoading(true);
        // Load from session storage for guests
        const guestCart = readGuestCart();
        setItems((prev) => (areCartItemsEqual(prev, guestCart) ? prev : guestCart));
      }

      if (!hasInitialSnapshotForUser) {
        setIsLoading(false);
      }
    };

    initializeCart();
  }, [userId, status, fetchUserCart]);

  // Listen for cart updates from other components/tabs
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleUpdate = () => {
      if (userId && status === "authenticated") {
        fetchUserCart().then((next) => {
          setItems((prev) => (areCartItemsEqual(prev, next) ? prev : next));
        });
      } else {
        const guestCart = readGuestCart();
        setItems((prev) => (areCartItemsEqual(prev, guestCart) ? prev : guestCart));
      }
    };

    window.addEventListener(CART_EVENT, handleUpdate);

    return () => {
      window.removeEventListener(CART_EVENT, handleUpdate);
    };
  }, [userId, status, fetchUserCart]);

  const flushUserCartWrite = useCallback(() => {
    const epoch = writeEpochRef.current;

    writeQueueRef.current = writeQueueRef.current.then(async () => {
      if (writeEpochRef.current !== epoch) return;

      const toWrite = pendingWriteRef.current;
      pendingWriteRef.current = null;
      if (!toWrite) return;

      const { userId: currentUserId, status: currentStatus } = authRef.current;
      if (!currentUserId || currentStatus !== "authenticated") return;

      await writeUserCart(toWrite);
    });
  }, []);

  const scheduleUserCartWrite = useCallback(
    (next: CartItem[]) => {
      pendingWriteRef.current = next;
      if (writeTimerRef.current) {
        window.clearTimeout(writeTimerRef.current);
      }
      writeTimerRef.current = window.setTimeout(() => {
        writeTimerRef.current = null;
        flushUserCartWrite();
      }, USER_CART_WRITE_DEBOUNCE_MS);
    },
    [flushUserCartWrite]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const flushIfPending = () => {
      if (writeTimerRef.current) {
        window.clearTimeout(writeTimerRef.current);
        writeTimerRef.current = null;
      }
      flushUserCartWrite();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushIfPending();
      }
    };

    window.addEventListener("pagehide", flushIfPending);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", flushIfPending);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [flushUserCartWrite]);

  const updateItems = useCallback(
    async (updater: (prev: CartItem[]) => CartItem[]) => {
      setItems((prev) => {
        const next = updater(prev);
        if (areCartItemsEqual(prev, next)) return prev;

        // Write to appropriate storage
        if (userId && status === "authenticated") {
          scheduleUserCartWrite(next);
          userCartCacheRef.current = next;
          userCartLastFetchRef.current = Date.now();
        } else {
          writeGuestCart(next);
        }

        return next;
      });
    },
    [userId, status, scheduleUserCartWrite]
  );

  const addItem = useCallback(
    async (item: Omit<CartItem, "quantity">, quantity: number = 1) => {
      if (isAddingRef.current) return;
      isAddingRef.current = true;

      try {
        await updateItems((prev) => {
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
      } finally {
        isAddingRef.current = false;
      }
    },
    [updateItems]
  );

  const removeItem = useCallback(
    async (id: string) => {
      await updateItems((prev) => prev.filter((entry) => entry.id !== id));
    },
    [updateItems]
  );

  const updateQuantity = useCallback(
    async (id: string, quantity: number) => {
      await updateItems((prev) =>
        prev
          .map((entry) => (entry.id === id ? { ...entry, quantity } : entry))
          .filter((entry) => entry.quantity > 0)
      );
    },
    [updateItems]
  );

  const clearCart = useCallback(async () => {
    await updateItems(() => []);
  }, [updateItems]);

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  return {
    items,
    itemCount,
    isLoading,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
  };
}

type CartProviderProps = {
  children: ReactNode;
  initialItems?: CartItem[];
  initialUserId?: string;
};

export function CartProvider({
  children,
  initialItems,
  initialUserId,
}: CartProviderProps) {
  const value = useCartState({ initialItems, initialUserId });
  return createElement(CartContext.Provider, { value }, children);
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
