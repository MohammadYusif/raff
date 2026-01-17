// src/app/auth/register/RegisterForm.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Input } from "@/shared/components/ui";
import { toast } from "sonner";
import { Loader2, AlertCircle, CheckCircle, Mail } from "lucide-react";
import {
  PasswordStrengthIndicator,
  validatePassword,
} from "@/shared/components/PasswordStrengthIndicator";
import {
  NameValidationIndicator,
  validateName,
} from "@/shared/components/NameValidationIndicator";
import {
  EmailValidationIndicator,
  validateEmail,
} from "@/shared/components/EmailValidationIndicator";
import { AnimatedButton } from "@/shared/components/AnimatedButton";
import Link from "next/link";

type Step = "details" | "verify";

export function RegisterForm() {
  const t = useTranslations("auth.register");
  const router = useRouter();
  const locale = useLocale();
  const [step, setStep] = useState<Step>("details");
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otp, setOtp] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptedTerms: false,
  });

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Clear error for a field when user starts typing
  const clearFieldError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = t("errors.nameRequired");
    } else {
      const nameValidation = validateName(formData.name);
      if (!nameValidation.isValid) {
        newErrors.name = nameValidation.errors[0];
      }
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = t("errors.emailRequired");
    } else {
      const emailValidation = validateEmail(formData.email);
      if (!emailValidation.isValid) {
        newErrors.email = t("errors.emailInvalid");
      }
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = t("errors.passwordRequired");
    } else {
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        newErrors.password = passwordValidation.errors[0];
      }
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t("errors.confirmPasswordRequired");
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t("passwordMismatch");
    }

    // Terms acceptance validation
    if (!formData.acceptedTerms) {
      newErrors.acceptedTerms = t("termsRequired");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const sendOtp = useCallback(async () => {
    setSendingOtp(true);
    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          type: "REGISTRATION",
          locale,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setErrors({ email: t("errors.emailExists") });
          setStep("details");
        } else if (response.status === 429) {
          setResendCooldown(data.cooldownRemaining || 60);
        } else {
          toast.error(t("errors.sendOtpFailed"));
        }
        return false;
      }

      toast.success(t("otpSent"), {
        description: t("otpSentDesc"),
      });
      setResendCooldown(60);
      return true;
    } catch (error) {
      console.error("Send OTP error:", error);
      toast.error(t("errors.sendOtpFailed"));
      return false;
    } finally {
      setSendingOtp(false);
    }
  }, [formData.email, locale, t]);

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Send OTP and move to verify step
    const sent = await sendOtp();
    if (sent) {
      setStep("verify");
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      setErrors({ otp: t("errors.otpRequired") });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          otp,
          type: "REGISTRATION",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === "INVALID_OTP") {
          setErrors({ otp: t("errors.otpInvalid") });
        } else if (data.code === "OTP_NOT_FOUND") {
          setErrors({ otp: t("errors.otpExpired") });
        } else if (data.code === "MAX_ATTEMPTS_EXCEEDED") {
          setErrors({ otp: t("errors.tooManyAttempts") });
        } else {
          toast.error(t("error"));
        }
        return;
      }

      // OTP verified, now register the user
      toast.success(t("otpVerified"));
      await completeRegistration();
    } catch (error) {
      console.error("Verify OTP error:", error);
      toast.error(t("error"));
    } finally {
      setLoading(false);
    }
  };

  const completeRegistration = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          emailVerified: true,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 409) {
          setErrors({ email: t("errors.emailExists") });
          setStep("details");
        } else {
          toast.error(data?.error || t("error"));
        }
        return;
      }

      // Auto-login after successful registration
      const signInResult = await signIn("credentials", {
        redirect: false,
        email: formData.email,
        password: formData.password,
      });

      if (signInResult?.error) {
        // If auto-login fails, redirect to login page
        toast.success(t("success"), {
          description: t("successDescription"),
        });
        router.push("/auth/login");
        return;
      }

      toast.success(t("success"), {
        description: t("successDescription"),
      });

      // Redirect to home page after successful auto-login
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Registration error:", error);
      toast.error(t("error"));
    } finally {
      setLoading(false);
    }
  };

  const handleChangeEmail = () => {
    setStep("details");
    setOtp("");
    setErrors({});
  };

  // OTP Verification Step
  if (step === "verify") {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-raff-accent/10">
            <Mail className="h-8 w-8 text-raff-accent" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-raff-primary">
            {t("verifyEmail")}
          </h2>
          <p className="text-sm text-raff-neutral-600">
            {t("enterOtp")}
          </p>
          <p className="mt-1 font-medium text-raff-primary">{formData.email}</p>
          <button
            type="button"
            onClick={handleChangeEmail}
            className="mt-1 text-sm text-raff-accent hover:underline"
          >
            {t("changeEmail")}
          </button>
        </div>

        <div>
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={otp}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "");
              setOtp(value);
              clearFieldError("otp");
            }}
            placeholder={t("otpPlaceholder")}
            disabled={loading}
            className={`text-center text-2xl tracking-widest ${
              errors.otp ? "border-red-500 focus:border-red-500" : ""
            }`}
          />
          {errors.otp && (
            <div className="mt-1.5 flex items-center justify-center gap-1.5 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span>{errors.otp}</span>
            </div>
          )}
        </div>

        <AnimatedButton
          type="button"
          onClick={handleVerifyOtp}
          className="w-full"
          disabled={loading || otp.length !== 6}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("verifying")}
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              {t("verifyOtp")}
            </>
          )}
        </AnimatedButton>

        <div className="text-center">
          {resendCooldown > 0 ? (
            <p className="text-sm text-raff-neutral-500">
              {t("resendIn", { seconds: resendCooldown })}
            </p>
          ) : (
            <button
              type="button"
              onClick={sendOtp}
              disabled={sendingOtp}
              className="text-sm text-raff-accent hover:underline disabled:opacity-50"
            >
              {sendingOtp ? t("sendingOtp") : t("resendOtp")}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Details Step
  return (
    <form onSubmit={handleDetailsSubmit} className="space-y-4">
      {/* Name Field */}
      <div>
        <label
          htmlFor="name"
          className="mb-2 block text-sm font-medium text-raff-neutral-700"
        >
          {t("nameLabel")}
        </label>
        <Input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => {
            setFormData({ ...formData, name: e.target.value });
            clearFieldError("name");
          }}
          placeholder={t("namePlaceholder")}
          disabled={loading || sendingOtp}
          className={errors.name ? "border-red-500 focus:border-red-500" : ""}
        />
        {errors.name && (
          <div className="mt-1.5 flex items-center gap-1.5 text-sm text-red-600 animate-in fade-in slide-in-from-top-1 duration-200">
            <AlertCircle className="h-4 w-4" />
            <span>{errors.name}</span>
          </div>
        )}

        {/* Name Validation Indicator */}
        {formData.name && !errors.name && (
          <NameValidationIndicator name={formData.name} />
        )}
      </div>

      {/* Email Field */}
      <div>
        <label
          htmlFor="email"
          className="mb-2 block text-sm font-medium text-raff-neutral-700"
        >
          {t("emailLabel")}
        </label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => {
            setFormData({ ...formData, email: e.target.value });
            clearFieldError("email");
          }}
          placeholder={t("emailPlaceholder")}
          disabled={loading || sendingOtp}
          className={errors.email ? "border-red-500 focus:border-red-500" : ""}
        />
        {errors.email && (
          <div className="mt-1.5 flex items-center gap-1.5 text-sm text-red-600 animate-in fade-in slide-in-from-top-1 duration-200">
            <AlertCircle className="h-4 w-4" />
            <span>{errors.email}</span>
          </div>
        )}

        {/* Email Validation Indicator */}
        {formData.email && !errors.email && (
          <EmailValidationIndicator email={formData.email} />
        )}
      </div>

      {/* Password Field */}
      <div>
        <label
          htmlFor="password"
          className="mb-2 block text-sm font-medium text-raff-neutral-700"
        >
          {t("passwordLabel")}
        </label>
        <Input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => {
            setFormData({ ...formData, password: e.target.value });
            clearFieldError("password");
          }}
          placeholder={t("passwordPlaceholder")}
          disabled={loading || sendingOtp}
          className={
            errors.password ? "border-red-500 focus:border-red-500" : ""
          }
        />
        {errors.password && (
          <div className="mt-1.5 flex items-center gap-1.5 text-sm text-red-600 animate-in fade-in slide-in-from-top-1 duration-200">
            <AlertCircle className="h-4 w-4" />
            <span>{errors.password}</span>
          </div>
        )}

        {/* Password Strength Indicator */}
        {formData.password && !errors.password && (
          <div className="mt-3">
            <PasswordStrengthIndicator
              password={formData.password}
              showRules={true}
            />
          </div>
        )}
      </div>

      {/* Confirm Password Field */}
      <div>
        <label
          htmlFor="confirmPassword"
          className="mb-2 block text-sm font-medium text-raff-neutral-700"
        >
          {t("confirmPasswordLabel")}
        </label>
        <Input
          id="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={(e) => {
            setFormData({ ...formData, confirmPassword: e.target.value });
            clearFieldError("confirmPassword");
          }}
          placeholder={t("confirmPasswordPlaceholder")}
          disabled={loading || sendingOtp}
          className={
            errors.confirmPassword ? "border-red-500 focus:border-red-500" : ""
          }
        />
        {errors.confirmPassword && (
          <div className="mt-1.5 flex items-center gap-1.5 text-sm text-red-600 animate-in fade-in slide-in-from-top-1 duration-200">
            <AlertCircle className="h-4 w-4" />
            <span>{errors.confirmPassword}</span>
          </div>
        )}
      </div>

      {/* Terms Acceptance Checkbox */}
      <div>
        <div className="flex items-start gap-2">
          <input
            id="acceptedTerms"
            type="checkbox"
            checked={formData.acceptedTerms}
            onChange={(e) => {
              setFormData({ ...formData, acceptedTerms: e.target.checked });
              clearFieldError("acceptedTerms");
            }}
            disabled={loading || sendingOtp}
            className="mt-1 h-4 w-4 rounded border-raff-neutral-300 text-raff-accent focus:ring-raff-accent"
          />
          <label
            htmlFor="acceptedTerms"
            className="text-sm text-raff-neutral-700"
          >
            {t("acceptTerms")}{" "}
            <Link
              href="/terms"
              className="text-raff-accent hover:underline"
              target="_blank"
            >
              {t("termsOfService")}
            </Link>{" "}
            {t("and")}{" "}
            <Link
              href="/privacy"
              className="text-raff-accent hover:underline"
              target="_blank"
            >
              {t("privacyPolicy")}
            </Link>
          </label>
        </div>
        {errors.acceptedTerms && (
          <div className="mt-1.5 flex items-center gap-1.5 text-sm text-red-600 animate-in fade-in slide-in-from-top-1 duration-200">
            <AlertCircle className="h-4 w-4" />
            <span>{errors.acceptedTerms}</span>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <AnimatedButton type="submit" className="w-full" disabled={loading || sendingOtp}>
        {sendingOtp ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("sendingOtp")}
          </>
        ) : (
          t("submit")
        )}
      </AnimatedButton>
    </form>
  );
}
