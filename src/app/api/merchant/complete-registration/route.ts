// src/app/api/merchant/complete-registration/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRegistrationToken } from "@/lib/registrationToken";
import bcrypt from "bcryptjs";
import { z } from "zod";

const completeRegistrationSchema = z.object({
  token: z.string().min(1),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = completeRegistrationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const { token, email, password, name } = validation.data;

    // Verify token
    const payload = verifyRegistrationToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: "Invalid or expired registration token" },
        { status: 400 }
      );
    }

    // Check if user exists and registration is incomplete
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        registrationCompleted: true,
        email: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (user.registrationCompleted) {
      return NextResponse.json(
        { error: "Registration already completed" },
        { status: 400 }
      );
    }

    // Check if new email is already in use by another user
    if (email.toLowerCase() !== user.email.toLowerCase()) {
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "Email address is already in use" },
          { status: 409 }
        );
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update user and merchant in a transaction
    await prisma.$transaction(async (tx) => {
      // Update user
      await tx.user.update({
        where: { id: payload.userId },
        data: {
          email: email.toLowerCase(),
          passwordHash,
          ...(name && { name }),
          emailVerified: new Date(), // Mark email as verified
          registrationCompleted: true,
        },
      });

      // Update merchant email if provided
      await tx.merchant.update({
        where: { id: payload.merchantId },
        data: {
          email: email.toLowerCase(),
          ...(name && { name, nameAr: name }),
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Registration completed successfully",
    });
  } catch (error) {
    console.error("Complete registration error:", error);
    return NextResponse.json(
      { error: "Failed to complete registration" },
      { status: 500 }
    );
  }
}
