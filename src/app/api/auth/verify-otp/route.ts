// src/app/api/auth/verify-otp/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyOTP } from "@/lib/services/otp.service";
import { OTPType } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, otp, type = "REGISTRATION" } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    if (!otp || typeof otp !== "string") {
      return NextResponse.json(
        { error: "OTP is required" },
        { status: 400 }
      );
    }

    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { error: "Invalid OTP format" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const otpType = type as OTPType;

    const result = await verifyOTP(normalizedEmail, otp, otpType);

    if (!result.success) {
      const errorMessages: Record<string, { message: string; status: number }> = {
        OTP_NOT_FOUND: { message: "OTP expired or not found", status: 400 },
        MAX_ATTEMPTS_EXCEEDED: { message: "Too many failed attempts", status: 429 },
        INVALID_OTP: { message: "Invalid OTP", status: 400 },
      };

      const errorInfo = errorMessages[result.error || ""] || {
        message: "Verification failed",
        status: 400,
      };

      return NextResponse.json(
        { error: errorInfo.message, code: result.error },
        { status: errorInfo.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}
