// src/app/auth/login/LoginForm.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { getSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Input } from "@/shared/components/ui";
import { toast } from "sonner";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { AnimatedButton } from "@/shared/components/AnimatedButton";

export function LoginForm() {
  const t = useTranslations("auth.login");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    email: "",
    password: "",
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

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = t("errors.emailRequired");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t("errors.emailInvalid");
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = t("errors.passwordRequired");
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
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        // Handle specific error messages
        if (result.error.includes("Invalid email or password")) {
          setErrors({
            password: t("errors.invalidCredentials"),
          });
        } else if (result.error.includes("Too many")) {
          toast.error(t("errors.tooManyAttempts"));
        } else if (result.error.includes("pending approval")) {
          toast.error(result.error, { duration: 5000 });
        } else if (result.error.includes("deactivated")) {
          toast.error(result.error, { duration: 5000 });
        } else {
          toast.error(result.error);
        }
        setLoading(false);
        return;
      }

      if (result?.ok) {
        // Success - show beautiful toast
        const session = await getSession();
        const userName = session?.user?.name || "there";

        toast.success(t("success"), {
          description: t("successDescription", { name: userName }),
          icon: <CheckCircle2 className="h-5 w-5" />,
          duration: 2000,
        });

        // Redirect based on role
        const role = session?.user?.role;
        setTimeout(() => {
          if (role === "MERCHANT" || role === "ADMIN") {
            router.push("/merchant/dashboard");
          } else {
            router.push("/");
          }
          router.refresh();
        }, 800);
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error(t("error"));
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Email */}
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
          <div className="mt-1.5 flex items-center gap-1.5 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>{errors.email}</span>
          </div>
        )}
      </div>

      {/* Password */}
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
          <div className="mt-1.5 flex items-center gap-1.5 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>{errors.password}</span>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <AnimatedButton type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("submitting")}
          </>
        ) : (
          t("submit")
        )}
      </AnimatedButton>
    </form>
  );
}