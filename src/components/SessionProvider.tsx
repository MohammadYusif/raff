// src/components/SessionProvider.tsx
"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { CartProvider } from "@/lib/hooks/useCart";

interface SessionProviderProps {
  children: ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  return (
    <NextAuthSessionProvider>
      <CartProvider>{children}</CartProvider>
    </NextAuthSessionProvider>
  );
}
