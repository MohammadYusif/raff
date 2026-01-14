// src/app/api/auth/send-otp/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createOTP } from "@/lib/services/otp.service";
import { sendOTPEmail } from "@/lib/services/email.service";
import { prisma } from "@/lib/prisma";
import { OTPType } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, type = "REGISTRATION", locale = "ar" } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // For registration, check if email already exists
    if (type === "REGISTRATION") {
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "Email already registered" },
          { status: 409 }
        );
      }
    }

    // Create OTP
    const otpType = type as OTPType;
    const { otp } = await createOTP(normalizedEmail, otpType);

    // Send OTP email
    await sendOTPEmail(normalizedEmail, otp, locale === "en" ? "en" : "ar");

    return NextResponse.json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error("Send OTP error:", error);

    // Handle cooldown error
    if (error instanceof Error && error.message.startsWith("COOLDOWN:")) {
      const seconds = error.message.split(":")[1];
      return NextResponse.json(
        { error: "Too many requests", cooldownRemaining: parseInt(seconds) },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Failed to send OTP" },
      { status: 500 }
    );
  }
}
