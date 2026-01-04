// src/components/SessionProvider.tsx
"use client";

import type { Session } from "next-auth";
import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import type { CartItem } from "@/lib/cart/types";
import { CartProvider } from "@/lib/hooks/useCart";

interface SessionProviderProps {
  children: ReactNode;
  session?: Session | null;
  initialCartItems?: CartItem[];
  initialCartUserId?: string;
}

export function SessionProvider({
  children,
  session,
  initialCartItems,
  initialCartUserId,
}: SessionProviderProps) {
  return (
    <NextAuthSessionProvider session={session}>
      <CartProvider
        initialItems={initialCartItems}
        initialUserId={initialCartUserId}
      >
        {children}
      </CartProvider>
    </NextAuthSessionProvider>
  );
}
