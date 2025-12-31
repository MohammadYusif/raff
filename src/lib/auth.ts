// src/lib/auth.ts
import type { NextAuthOptions, User } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { rateLimit, getRequestIp } from "@/lib/rateLimit";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
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
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing credentials");
        }

        const ip = getRequestIp(req?.headers);
        const limit = rateLimit(`auth:${ip}`, {
          windowMs: 60_000,
          max: 30,
        });

        if (!limit.allowed) {
          throw new Error("Too many login attempts. Please try again later.");
        }

        const userRecord = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            passwordHash: true,
            avatar: true,
          },
        });

        if (!userRecord?.passwordHash) {
          throw new Error("Invalid email or password");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          userRecord.passwordHash
        );

        if (!isPasswordValid) {
          throw new Error("Invalid email or password");
        }

        if (userRecord.role === UserRole.MERCHANT) {
          const merchantProfile = await prisma.merchant.findFirst({
            where: { userId: userRecord.id },
            select: { status: true, isActive: true },
          });

          if (!merchantProfile) {
            throw new Error("Merchant profile not found");
          }

          if (merchantProfile.status !== "APPROVED") {
            throw new Error(
              "Your account is pending approval. Please wait for admin approval."
            );
          }

          if (!merchantProfile.isActive) {
            throw new Error(
              "Your account has been deactivated. Please contact support."
            );
          }
        }

        const user: User = {
          id: userRecord.id,
          email: userRecord.email,
          name: userRecord.name,
          role: userRecord.role,
          image: userRecord.avatar ?? undefined,
        };

        return user;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as User).role;
      }

      if (!token.id && token.sub) {
        token.id = token.sub;
      }

      return token;
    },
    async session({ session, token }) {
      const userId = typeof token.id === "string" ? token.id : token.sub;

      if (session.user && userId) {
        session.user.id = userId;
        session.user.role = token.role as UserRole;
        if (token.email) session.user.email = token.email;
        if (token.name) session.user.name = token.name;

        const merchant = await prisma.merchant.findFirst({
          where: { userId },
          select: { id: true },
        });

        session.user.merchantId = merchant?.id ?? null;
      }

      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
