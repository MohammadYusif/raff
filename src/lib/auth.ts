// src/lib/auth.ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      nameAr?: string | null;
    };
  }
  interface User {
    id: string;
    nameAr?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    nameAr?: string | null;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing credentials");
        }

        const merchant = await prisma.merchant.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            email: true,
            name: true,
            nameAr: true,
            password: true,
            status: true,
            isActive: true,
            logo: true,
          },
        });

        if (!merchant || !merchant.password) {
          throw new Error("Invalid email or password");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          merchant.password
        );

        if (!isPasswordValid) {
          throw new Error("Invalid email or password");
        }

        if (merchant.status !== "APPROVED") {
          throw new Error(
            "Your account is pending approval. Please wait for admin approval."
          );
        }

        if (!merchant.isActive) {
          throw new Error(
            "Your account has been deactivated. Please contact support."
          );
        }

        return {
          id: merchant.id,
          email: merchant.email,
          name: merchant.name,
          nameAr: merchant.nameAr,
          image: merchant.logo,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.nameAr = user.nameAr;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.nameAr = token.nameAr as string | null | undefined;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
