// src/lib/services/otp.service.ts
import { prisma } from "@/lib/prisma";
import { OTPType } from "@prisma/client";

const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;
const OTP_COOLDOWN_SECONDS = 60; // 1 minute between OTP requests

function generateOTP(): string {
  // Generate a 6-digit OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createOTP(
  email: string,
  type: OTPType = "REGISTRATION"
): Promise<{ otp: string; cooldownRemaining?: number }> {
  const normalizedEmail = email.toLowerCase().trim();

  // Check for recent OTP (rate limiting)
  const recentOTP = await prisma.emailOTP.findFirst({
    where: {
      email: normalizedEmail,
      type,
      createdAt: {
        gte: new Date(Date.now() - OTP_COOLDOWN_SECONDS * 1000),
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (recentOTP) {
    const cooldownRemaining = Math.ceil(
      (recentOTP.createdAt.getTime() + OTP_COOLDOWN_SECONDS * 1000 - Date.now()) / 1000
    );
    throw new Error(`COOLDOWN:${cooldownRemaining}`);
  }

  // Invalidate any existing OTPs for this email and type
  await prisma.emailOTP.updateMany({
    where: {
      email: normalizedEmail,
      type,
      isUsed: false,
    },
    data: {
      isUsed: true,
    },
  });

  // Generate new OTP
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.emailOTP.create({
    data: {
      email: normalizedEmail,
      otp,
      type,
      expiresAt,
    },
  });

  return { otp };
}

export async function verifyOTP(
  email: string,
  otp: string,
  type: OTPType = "REGISTRATION"
): Promise<{ success: boolean; error?: string }> {
  const normalizedEmail = email.toLowerCase().trim();

  const otpRecord = await prisma.emailOTP.findFirst({
    where: {
      email: normalizedEmail,
      type,
      isUsed: false,
      expiresAt: {
        gte: new Date(),
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!otpRecord) {
    return { success: false, error: "OTP_NOT_FOUND" };
  }

  // Check max attempts
  if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
    await prisma.emailOTP.update({
      where: { id: otpRecord.id },
      data: { isUsed: true },
    });
    return { success: false, error: "MAX_ATTEMPTS_EXCEEDED" };
  }

  // Increment attempts
  await prisma.emailOTP.update({
    where: { id: otpRecord.id },
    data: { attempts: { increment: 1 } },
  });

  // Verify OTP
  if (otpRecord.otp !== otp) {
    return { success: false, error: "INVALID_OTP" };
  }

  // Mark as used
  await prisma.emailOTP.update({
    where: { id: otpRecord.id },
    data: { isUsed: true },
  });

  return { success: true };
}

export async function cleanupExpiredOTPs() {
  const deleted = await prisma.emailOTP.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { isUsed: true, createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      ],
    },
  });

  return deleted.count;
}
