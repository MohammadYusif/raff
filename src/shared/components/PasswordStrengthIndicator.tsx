// src/shared/components/PasswordStrengthIndicator.tsx
"use client";

import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";

interface PasswordRule {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

interface PasswordStrengthIndicatorProps {
  password: string;
  showRules?: boolean;
}

/**
 * Password Strength Indicator Component with Animations
 *
 * Shows real-time validation of password rules with smooth animations
 */
export function PasswordStrengthIndicator({
  password,
  showRules = true,
}: PasswordStrengthIndicatorProps) {
  const t = useTranslations("auth.validation");

  // Common weak passwords to check against
  const commonPasswords = [
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

  const rules: PasswordRule[] = [
    {
      id: "minLength",
      label: t("minLength"),
      test: (pwd) => pwd.length >= 8,
    },
    {
      id: "uppercase",
      label: t("uppercase"),
      test: (pwd) => /[A-Z]/.test(pwd),
    },
    {
      id: "lowercase",
      label: t("lowercase"),
      test: (pwd) => /[a-z]/.test(pwd),
    },
    {
      id: "number",
      label: t("number"),
      test: (pwd) => /[0-9]/.test(pwd),
    },
    {
      id: "special",
      label: t("special"),
      test: (pwd) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
    },
    {
      id: "notCommon",
      label: t("notCommon"),
      test: (pwd) => !commonPasswords.includes(pwd.toLowerCase()),
    },
  ];

  const passedRules = rules.filter((rule) => rule.test(password)).length;
  const totalRules = rules.length;
  const strengthPercentage = (passedRules / totalRules) * 100;

  // Determine strength level
  const getStrengthLevel = () => {
    if (strengthPercentage === 0) return null;
    if (strengthPercentage < 50) return "weak";
    if (strengthPercentage < 80) return "medium";
    return "strong";
  };

  const strengthLevel = getStrengthLevel();

  // Strength colors
  const strengthColors = {
    weak: "bg-red-500",
    medium: "bg-yellow-500",
    strong: "bg-green-500",
  };

  const strengthTextColors = {
    weak: "text-red-600",
    medium: "text-yellow-600",
    strong: "text-green-600",
  };

  if (!password && !showRules) return null;

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Strength Bar */}
      {password && (
        <div className="space-y-2 animate-in fade-in duration-200">
          <div className="h-2 w-full rounded-full bg-raff-neutral-200 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                strengthLevel
                  ? strengthColors[strengthLevel]
                  : "bg-raff-neutral-300"
              }`}
              style={{ width: `${strengthPercentage}%` }}
            />
          </div>
          {strengthLevel && (
            <p
              className={`text-xs font-medium transition-colors duration-300 ${strengthTextColors[strengthLevel]}`}
            >
              {strengthLevel === "weak" && t("strengthWeak")}
              {strengthLevel === "medium" && t("strengthMedium")}
              {strengthLevel === "strong" && t("strengthStrong")}
            </p>
          )}
        </div>
      )}

      {/* Rules List */}
      {showRules && (
        <ul className="space-y-2">
          {rules.map((rule, index) => {
            const passed = rule.test(password);
            return (
              <li
                key={rule.id}
                className="flex items-center gap-2 text-sm transition-all duration-300 animate-in fade-in slide-in-from-left-1"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="transition-transform duration-200 hover:scale-110">
                  {passed ? (
                    <Check className="h-4 w-4 shrink-0 text-green-600 animate-in zoom-in duration-200" />
                  ) : (
                    <X className="h-4 w-4 shrink-0 text-raff-neutral-400" />
                  )}
                </div>
                <span
                  className={`transition-colors duration-300 ${
                    passed
                      ? "text-green-600 font-medium"
                      : "text-raff-neutral-600"
                  }`}
                >
                  {rule.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/**
 * Validate password against all rules
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const commonPasswords = [
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

  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push("Password is too common");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
