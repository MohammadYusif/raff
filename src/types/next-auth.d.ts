// src/types/next-auth.d.ts
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      role: "CUSTOMER" | "MERCHANT" | "ADMIN";
      merchantId?: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    image?: string | null;
    role: "CUSTOMER" | "MERCHANT" | "ADMIN";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email?: string | null;
    name?: string | null;
    role?: "CUSTOMER" | "MERCHANT" | "ADMIN";
    merchantId?: string | null;
  }
}
