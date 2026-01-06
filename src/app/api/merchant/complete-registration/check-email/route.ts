// src/app/api/merchant/complete-registration/check-email/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRegistrationToken } from "@/lib/registrationToken";
import { z } from "zod";

const checkEmailSchema = z.object({
  token: z.string().min(1),
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = checkEmailSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    const { token, email } = validation.data;
    const payload = verifyRegistrationToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: "Invalid or expired registration token" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { email: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const normalizedEmail = email.toLowerCase();
    if (normalizedEmail !== user.email.toLowerCase()) {
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "Email address is already in use" },
          { status: 409 }
        );
      }
    }

    return NextResponse.json({ available: true });
  } catch (error) {
    console.error("Check email availability error:", error);
    return NextResponse.json(
      { error: "Failed to check email availability" },
      { status: 500 }
    );
  }
}
