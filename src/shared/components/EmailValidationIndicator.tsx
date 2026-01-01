// src/shared/components/EmailValidationIndicator.tsx
"use client";

import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";

interface EmailValidationIndicatorProps {
  email: string;
}

/**
 * Email Validation Indicator Component
 *
 * Shows real-time validation for email field:
 * - Contains @ symbol
 * - Has domain (.com, .net, etc.)
 * - Valid format
 */
export function EmailValidationIndicator({
  email,
}: EmailValidationIndicatorProps) {
  const t = useTranslations("auth.validation");

  const rules = [
    {
      id: "hasAt",
      label: t("emailHasAt"),
      test: (e: string) => e.includes("@"),
    },
    {
      id: "hasDomain",
      label: t("emailHasDomain"),
      test: (e: string) => /\.[a-z]{2,}$/i.test(e),
    },
    {
      id: "validFormat",
      label: t("emailValidFormat"),
      test: (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e),
    },
  ];

  const passedRules = rules.filter((rule) => rule.test(email)).length;
  const totalRules = rules.length;
  const isValid = passedRules === totalRules;

  if (!email) return null;

  return (
    <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
      {rules.map((rule, index) => {
        const passed = rule.test(email);
        return (
          <div
            key={rule.id}
            className="flex items-center gap-2 text-xs transition-all duration-300 animate-in fade-in slide-in-from-left-1"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="transition-transform duration-200 hover:scale-110">
              {passed ? (
                <Check className="h-3.5 w-3.5 shrink-0 text-green-600 animate-in zoom-in duration-200" />
              ) : (
                <X className="h-3.5 w-3.5 shrink-0 text-raff-neutral-400" />
              )}
            </div>
            <span
              className={`transition-colors duration-300 ${
                passed ? "text-green-600 font-medium" : "text-raff-neutral-600"
              }`}
            >
              {rule.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Validate email
 */
export function validateEmail(email: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!email.includes("@")) {
    errors.push("Email must contain @ symbol");
  }
  if (!/\.[a-z]{2,}$/i.test(email)) {
    errors.push("Email must have a valid domain");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("Please enter a valid email address");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
