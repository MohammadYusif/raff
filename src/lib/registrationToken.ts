// src/lib/registrationToken.ts
import crypto from "crypto";

const SECRET = process.env.NEXTAUTH_SECRET || "fallback-secret-key";
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

interface RegistrationTokenPayload {
  userId: string;
  merchantId: string;
  email: string;
  exp: number;
}

/**
 * Create a secure registration token for incomplete merchant registrations
 */
export function createRegistrationToken(
  userId: string,
  merchantId: string,
  email: string
): string {
  const payload: RegistrationTokenPayload = {
    userId,
    merchantId,
    email,
    exp: Date.now() + TOKEN_EXPIRY_MS,
  };

  const payloadJson = JSON.stringify(payload);
  const payloadBase64 = Buffer.from(payloadJson).toString("base64url");

  // Create HMAC signature
  const hmac = crypto.createHmac("sha256", SECRET);
  hmac.update(payloadBase64);
  const signature = hmac.digest("base64url");

  return `${payloadBase64}.${signature}`;
}

/**
 * Verify and decode a registration token
 */
export function verifyRegistrationToken(
  token: string
): RegistrationTokenPayload | null {
  try {
    const [payloadBase64, signature] = token.split(".");
    if (!payloadBase64 || !signature) return null;

    // Verify signature
    const hmac = crypto.createHmac("sha256", SECRET);
    hmac.update(payloadBase64);
    const expectedSignature = hmac.digest("base64url");

    if (signature !== expectedSignature) return null;

    // Decode payload
    const payloadJson = Buffer.from(payloadBase64, "base64url").toString("utf8");
    const payload = JSON.parse(payloadJson) as RegistrationTokenPayload;

    // Check expiry
    if (Date.now() > payload.exp) return null;

    return payload;
  } catch (error) {
    console.error("Token verification error:", error);
    return null;
  }
}
