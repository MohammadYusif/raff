// src/app/merchant/complete-registration/CompleteRegistrationContent.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageLayout } from "@/shared/components/layouts";
import {
  Container,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Input,
} from "@/shared/components/ui";
import { CheckCircle, AlertCircle, Store, Loader2 } from "lucide-react";
import { ArrowForward } from "@/core/i18n";
import { AnimatedButton } from "@/shared/components/AnimatedButton";
import { PasswordStrengthIndicator } from "@/shared/components/PasswordStrengthIndicator";
import { NameValidationIndicator } from "@/shared/components/NameValidationIndicator";
import { EmailValidationIndicator } from "@/shared/components/EmailValidationIndicator";
import { toast } from "sonner";
import Link from "next/link";

const COMMON_PASSWORDS = [
  "password",
  "12345678",
  "password123",
  "qwerty",
  "abc123",
  "letmein",
  "welcome",
  "monkey",
  "dragon",
  "master",
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type EmailStatus = "idle" | "checking" | "available" | "taken";

export function CompleteRegistrationContent() {
  const t = useTranslations("completeRegistration");
  const validationT = useTranslations("auth.validation");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenValid, setTokenValid] = useState(true);
  const [emailStatus, setEmailStatus] = useState<EmailStatus>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptedTerms: false,
  });

  const emailExistsMessage = t("errors.emailExists");
  const passwordMismatchMessage = t("errors.passwordMismatch");

  const passwordRules = useMemo(
    () => [
      {
        id: "minLength",
        test: (pwd: string) => pwd.length >= 8,
        message: validationT("minLength"),
      },
      {
        id: "uppercase",
        test: (pwd: string) => /[A-Z]/.test(pwd),
        message: validationT("uppercase"),
      },
      {
        id: "lowercase",
        test: (pwd: string) => /[a-z]/.test(pwd),
        message: validationT("lowercase"),
      },
      {
        id: "number",
        test: (pwd: string) => /[0-9]/.test(pwd),
        message: validationT("number"),
      },
      {
        id: "special",
        test: (pwd: string) =>
          /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd),
        message: validationT("special"),
      },
      {
        id: "notCommon",
        test: (pwd: string) => !COMMON_PASSWORDS.includes(pwd.toLowerCase()),
        message: validationT("notCommon"),
      },
    ],
    [validationT]
  );

  const nameRules = useMemo(
    () => [
      {
        id: "minLength",
        test: (value: string) => value.trim().length >= 6,
        message: validationT("nameMinLength"),
      },
      {
        id: "lettersOnly",
        test: (value: string) =>
          /^[a-zA-Z\u0600-\u06FF\s]+$/.test(value.trim()),
        message: validationT("nameLettersOnly"),
      },
      {
        id: "fullName",
        test: (value: string) => value.trim().split(/\s+/).length >= 2,
        message: validationT("nameFullName"),
      },
    ],
    [validationT]
  );

  const clearFieldError = (field: string) => {
    if (!errors[field]) return;
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      toast.error(t("errors.invalidLink"));
    }
  }, [token, t]);

  useEffect(() => {
    if (!formData.confirmPassword || !formData.password) return;
    if (formData.password !== formData.confirmPassword) {
      setErrors((prev) => ({
        ...prev,
        confirmPassword: passwordMismatchMessage,
      }));
      return;
    }
    setErrors((prev) => {
      if (!prev.confirmPassword) return prev;
      const next = { ...prev };
      delete next.confirmPassword;
      return next;
    });
  }, [formData.password, formData.confirmPassword, passwordMismatchMessage]);

  useEffect(() => {
    if (!token) return;
    const email = formData.email.trim();
    if (!email || !EMAIL_PATTERN.test(email)) {
      setEmailStatus("idle");
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setEmailStatus("checking");
      try {
        const response = await fetch(
          "/api/merchant/complete-registration/check-email",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ token, email }),
            signal: controller.signal,
          }
        );

        if (response.ok) {
          setEmailStatus("available");
          setErrors((prev) => {
            if (prev.email !== emailExistsMessage) return prev;
            const next = { ...prev };
            delete next.email;
            return next;
          });
          return;
        }

        if (response.status === 409) {
          setEmailStatus("taken");
          setErrors((prev) => ({ ...prev, email: emailExistsMessage }));
          return;
        }

        setEmailStatus("idle");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setEmailStatus("idle");
      }
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [formData.email, token, emailExistsMessage]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.name.trim()) {
      const invalidNameRule = nameRules.find(
        (rule) => !rule.test(formData.name)
      );
      if (invalidNameRule) {
        newErrors.name = invalidNameRule.message;
      }
    }

    if (!formData.email.trim()) {
      newErrors.email = t("errors.emailRequired");
    } else if (!EMAIL_PATTERN.test(formData.email)) {
      newErrors.email = t("errors.emailInvalid");
    } else if (emailStatus === "taken") {
      newErrors.email = emailExistsMessage;
    }

    if (!formData.password) {
      newErrors.password = t("errors.passwordRequired");
    } else {
      const invalidPasswordRule = passwordRules.find(
        (rule) => !rule.test(formData.password)
      );
      if (invalidPasswordRule) {
        newErrors.password = invalidPasswordRule.message;
      }
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t("errors.confirmPasswordRequired");
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = passwordMismatchMessage;
    }

    // Terms acceptance validation
    if (!formData.acceptedTerms) {
      newErrors.acceptedTerms = t("errors.termsRequired");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!token) {
      toast.error(t("errors.invalidToken"));
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/merchant/complete-registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          email: formData.email,
          password: formData.password,
          name: formData.name.trim() || undefined,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 409) {
          setErrors({ email: emailExistsMessage });
          setIsSubmitting(false);
          return;
        }

        const errorMessage =
          typeof result?.error === "string" ? result.error : "";
        if (errorMessage.toLowerCase().includes("token")) {
          toast.error(t("errors.invalidToken"));
        } else if (errorMessage.toLowerCase().includes("completed")) {
          toast.error(t("errors.alreadyCompleted"));
        } else {
          toast.error(t("errors.registrationFailed"));
        }
        setIsSubmitting(false);
        return;
      }

      toast.success(t("success.title"), {
        description: t("success.description"),
        duration: 3000,
      });

      setTimeout(() => {
        router.push("/auth/login");
      }, 1200);
    } catch (error) {
      console.error("Registration error:", error);
      toast.error(t("errors.registrationFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!tokenValid) {
    return (
      <PageLayout navbarVariant="minimal">
        <div className="min-h-screen bg-raff-neutral-50 flex items-center justify-center">
          <Container className="py-12">
            <Card className="mx-auto max-w-md border-raff-danger/20 bg-raff-danger/5">
              <CardContent className="p-8 text-center">
                <div className="mb-4 flex justify-center">
                  <div className="rounded-full bg-raff-danger/10 p-3">
                    <AlertCircle className="h-8 w-8 text-raff-danger" />
                  </div>
                </div>
                <h2 className="mb-2 text-xl font-semibold text-raff-primary">
                  {t("invalidLink.title")}
                </h2>
                <p className="mb-6 text-raff-neutral-600">
                  {t("invalidLink.description")}
                </p>
                <AnimatedButton
                  onClick={() => router.push("/merchant/join")}
                  className="w-full"
                >
                  {t("actions.startOver")}
                </AnimatedButton>
              </CardContent>
            </Card>
          </Container>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout navbarVariant="minimal">
      <div className="min-h-screen bg-raff-neutral-50">
        {/* Header */}
        <div className="border-b border-raff-neutral-200 bg-white">
          <Container className="py-6">
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-raff-accent/10 p-3">
                  <Store className="h-8 w-8 text-raff-accent" />
                </div>
              </div>
              <h1 className="mb-2 text-3xl font-bold text-raff-primary">
                {t("title")}
              </h1>
              <p className="text-raff-neutral-600">{t("subtitle")}</p>
            </div>
          </Container>
        </div>

        <Container className="py-12">
          <div className="mx-auto max-w-lg space-y-8">
            {/* Success Steps */}
            <Card className="border-raff-success/20 bg-raff-success/5">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-raff-success" />
                    <div className="text-start">
                      <p className="font-medium text-raff-primary">
                        {t("steps.storeConnectedTitle")}
                      </p>
                      <p className="text-sm text-raff-neutral-600">
                        {t("steps.storeConnectedDescription")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-raff-success" />
                    <div className="text-start">
                      <p className="font-medium text-raff-primary">
                        {t("steps.productsSyncingTitle")}
                      </p>
                      <p className="text-sm text-raff-neutral-600">
                        {t("steps.productsSyncingDescription")}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Registration Form */}
            <Card>
              <CardHeader>
                <CardTitle>{t("form.title")}</CardTitle>
                <CardDescription>{t("form.description")}</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Name (Optional) */}
                  <div>
                    <label
                      htmlFor="name"
                      className="mb-2 block text-sm font-medium text-raff-primary text-start"
                    >
                      {t("form.nameLabel")}
                    </label>
                    <Input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(event) => {
                        setFormData((prev) => ({
                          ...prev,
                          name: event.target.value,
                        }));
                        clearFieldError("name");
                      }}
                      placeholder={t("form.namePlaceholder")}
                      disabled={isSubmitting}
                      className={
                        errors.name ? "border-red-500 focus:border-red-500" : ""
                      }
                    />
                    {errors.name && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-sm text-red-600 animate-in fade-in slide-in-from-top-1 duration-200">
                        <AlertCircle className="h-4 w-4" />
                        <span>{errors.name}</span>
                      </div>
                    )}

                    {formData.name && !errors.name && (
                      <NameValidationIndicator name={formData.name} />
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-2 block text-sm font-medium text-raff-primary text-start"
                    >
                      {t("form.emailLabel")}
                    </label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(event) => {
                        setFormData((prev) => ({
                          ...prev,
                          email: event.target.value,
                        }));
                        clearFieldError("email");
                        setEmailStatus("idle");
                      }}
                      placeholder={t("form.emailPlaceholder")}
                      disabled={isSubmitting}
                      className={
                        errors.email ? "border-red-500 focus:border-red-500" : ""
                      }
                    />
                    {errors.email && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-sm text-red-600 animate-in fade-in slide-in-from-top-1 duration-200">
                        <AlertCircle className="h-4 w-4" />
                        <span>{errors.email}</span>
                      </div>
                    )}

                    {!errors.email && emailStatus === "checking" && (
                      <p className="mt-1 text-xs text-raff-neutral-500">
                        {t("status.emailChecking")}
                      </p>
                    )}
                    {!errors.email && emailStatus === "available" && (
                      <p className="mt-1 text-xs text-raff-success">
                        {t("status.emailAvailable")}
                      </p>
                    )}

                    {formData.email && !errors.email && (
                      <EmailValidationIndicator email={formData.email} />
                    )}

                    <p className="mt-1 text-xs text-raff-neutral-500">
                      {t("form.emailHelp")}
                    </p>
                  </div>

                  {/* Password */}
                  <div>
                    <label
                      htmlFor="password"
                      className="mb-2 block text-sm font-medium text-raff-primary text-start"
                    >
                      {t("form.passwordLabel")}
                    </label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(event) => {
                        setFormData((prev) => ({
                          ...prev,
                          password: event.target.value,
                        }));
                        clearFieldError("password");
                      }}
                      placeholder={t("form.passwordPlaceholder")}
                      disabled={isSubmitting}
                      className={
                        errors.password
                          ? "border-red-500 focus:border-red-500"
                          : ""
                      }
                    />
                    {errors.password && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-sm text-red-600 animate-in fade-in slide-in-from-top-1 duration-200">
                        <AlertCircle className="h-4 w-4" />
                        <span>{errors.password}</span>
                      </div>
                    )}

                    {formData.password && !errors.password && (
                      <div className="mt-3">
                        <PasswordStrengthIndicator
                          password={formData.password}
                          showRules={true}
                        />
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="mb-2 block text-sm font-medium text-raff-primary text-start"
                    >
                      {t("form.confirmPasswordLabel")}
                    </label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(event) => {
                        setFormData((prev) => ({
                          ...prev,
                          confirmPassword: event.target.value,
                        }));
                        clearFieldError("confirmPassword");
                      }}
                      placeholder={t("form.confirmPasswordPlaceholder")}
                      disabled={isSubmitting}
                      className={
                        errors.confirmPassword
                          ? "border-red-500 focus:border-red-500"
                          : ""
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
                        onChange={(event) => {
                          setFormData((prev) => ({
                            ...prev,
                            acceptedTerms: event.target.checked,
                          }));
                          clearFieldError("acceptedTerms");
                        }}
                        disabled={isSubmitting}
                        className="mt-1 h-4 w-4 rounded border-raff-neutral-300 text-raff-accent focus:ring-raff-accent"
                      />
                      <label
                        htmlFor="acceptedTerms"
                        className="text-sm text-raff-neutral-700 text-start"
                      >
                        {t("form.acceptTerms")}{" "}
                        <Link
                          href="/terms"
                          className="text-raff-accent hover:underline"
                          target="_blank"
                        >
                          {t("form.termsOfService")}
                        </Link>{" "}
                        {t("form.and")}{" "}
                        <Link
                          href="/privacy"
                          className="text-raff-accent hover:underline"
                          target="_blank"
                        >
                          {t("form.privacyPolicy")}
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
                  <AnimatedButton
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full gap-2"
                    size="lg"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t("form.submitting")}
                      </>
                    ) : (
                      <>
                        {t("form.submit")}
                        <ArrowForward className="h-5 w-5" />
                      </>
                    )}
                  </AnimatedButton>
                </form>
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="border-raff-neutral-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-raff-accent" />
                  <div className="text-sm text-raff-neutral-600 text-start">
                    <p className="mb-1 font-medium text-raff-primary">
                      {t("info.title")}
                    </p>
                    <p>{t("info.description")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </Container>
      </div>
    </PageLayout>
  );
}
