// src/lib/services/email.service.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "noreply@raff.sa";
const FROM_NAME = "Raff";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail({ to, subject, html }: SendEmailOptions) {
  try {
    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to,
      subject,
      html,
    });

    if (error) {
      console.error("Email send error:", error);
      throw new Error(error.message);
    }

    return { success: true, data };
  } catch (error) {
    console.error("Failed to send email:", error);
    throw error;
  }
}

export async function sendOTPEmail(
  email: string,
  otp: string,
  locale: "en" | "ar" = "ar"
) {
  const isArabic = locale === "ar";

  const subject = isArabic
    ? "رمز التحقق الخاص بك - رَفّ"
    : "Your Verification Code - Raff";

  const html = `
<!DOCTYPE html>
<html lang="${locale}" dir="${isArabic ? "rtl" : "ltr"}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="500" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a365d 0%, #2d3748 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                ${isArabic ? "رَفّ" : "Raff"}
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px; text-align: center;">
              <h2 style="margin: 0 0 20px 0; color: #1a365d; font-size: 24px;">
                ${isArabic ? "رمز التحقق" : "Verification Code"}
              </h2>

              <p style="margin: 0 0 30px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
                ${isArabic
                  ? "استخدم الرمز التالي للتحقق من بريدك الإلكتروني:"
                  : "Use the following code to verify your email address:"}
              </p>

              <!-- OTP Code -->
              <div style="background-color: #f7fafc; border: 2px dashed #e2e8f0; border-radius: 8px; padding: 20px; margin: 0 0 30px 0;">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1a365d;">
                  ${otp}
                </span>
              </div>

              <p style="margin: 0 0 10px 0; color: #718096; font-size: 14px;">
                ${isArabic
                  ? "هذا الرمز صالح لمدة 10 دقائق"
                  : "This code is valid for 10 minutes"}
              </p>

              <p style="margin: 0; color: #a0aec0; font-size: 12px;">
                ${isArabic
                  ? "إذا لم تطلب هذا الرمز، يمكنك تجاهل هذه الرسالة"
                  : "If you didn't request this code, you can ignore this email"}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f7fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #a0aec0; font-size: 12px;">
                © ${new Date().getFullYear()} Raff. ${isArabic ? "جميع الحقوق محفوظة" : "All rights reserved."}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return sendEmail({ to: email, subject, html });
}

export async function sendWelcomeEmail(
  email: string,
  name: string,
  locale: "en" | "ar" = "ar"
) {
  const isArabic = locale === "ar";

  const subject = isArabic
    ? "مرحباً بك في رَفّ!"
    : "Welcome to Raff!";

  const html = `
<!DOCTYPE html>
<html lang="${locale}" dir="${isArabic ? "rtl" : "ltr"}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="500" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a365d 0%, #2d3748 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                ${isArabic ? "رَفّ" : "Raff"}
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px; text-align: center;">
              <h2 style="margin: 0 0 20px 0; color: #1a365d; font-size: 24px;">
                ${isArabic ? `مرحباً ${name}!` : `Welcome ${name}!`}
              </h2>

              <p style="margin: 0 0 30px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
                ${isArabic
                  ? "شكراً لانضمامك إلى رَفّ. يمكنك الآن اكتشاف أفضل المنتجات من المتاجر السعودية الموثوقة."
                  : "Thank you for joining Raff. You can now discover the best products from trusted Saudi stores."}
              </p>

              <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://raff.sa"}"
                 style="display: inline-block; background-color: #d69e2e; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                ${isArabic ? "ابدأ التسوق" : "Start Shopping"}
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f7fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #a0aec0; font-size: 12px;">
                © ${new Date().getFullYear()} Raff. ${isArabic ? "جميع الحقوق محفوظة" : "All rights reserved."}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return sendEmail({ to: email, subject, html });
}
