// src/app/auth/register/RegisterForm.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/shared/components/ui";
import { toast } from "sonner";
import { Loader2, AlertCircle } from "lucide-react";
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

export function RegisterForm() {
  const t = useTranslations("auth.register");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 409) {
          setErrors({ email: t("errors.emailExists") });
        } else {
          toast.error(data?.error || t("error"));
        }
        setLoading(false);
        return;
      }

      // Success - show beautiful toast and redirect
      toast.success(t("success"), {
        description: t("successDescription"),
        duration: 3000,
      });

      // Redirect after short delay
      setTimeout(() => {
        router.push("/auth/login");
      }, 1000);
    } catch (error) {
      console.error("Registration error:", error);
      toast.error(t("error"));
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          disabled={loading}
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
          disabled={loading}
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
          disabled={loading}
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
          disabled={loading}
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

      {/* Submit Button */}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("submitting")}
          </>
        ) : (
          t("submit")
        )}
      </Button>
    </form>
  );
}
