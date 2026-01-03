// src/shared/components/NameValidationIndicator.tsx
"use client";

import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";

interface NameValidationIndicatorProps {
  name: string;
}

/**
 * Name Validation Indicator Component
 *
 * Shows real-time validation for name field:
 * - Minimum 6 characters
 * - Only letters and spaces
 * - At least 2 words (first and last name)
 */
export function NameValidationIndicator({
  name,
}: NameValidationIndicatorProps) {
  const t = useTranslations("auth.validation");

  const rules = [
    {
      id: "minLength",
      label: t("nameMinLength"),
      test: (n: string) => n.trim().length >= 6,
    },
    {
      id: "lettersOnly",
      label: t("nameLettersOnly"),
      test: (n: string) => /^[a-zA-Z\u0600-\u06FF\s]+$/.test(n.trim()),
    },
    {
      id: "fullName",
      label: t("nameFullName"),
      test: (n: string) => n.trim().split(/\s+/).length >= 2,
    },
  ];

  if (!name) return null;

  return (
    <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
      {rules.map((rule, index) => {
        const passed = rule.test(name);
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
 * Validate name
 */
export function validateName(name: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const trimmedName = name.trim();

  if (trimmedName.length < 6) {
    errors.push("Name must be at least 6 characters");
  }
  if (!/^[a-zA-Z\u0600-\u06FF\s]+$/.test(trimmedName)) {
    errors.push("Name must contain only letters and spaces");
  }
  if (trimmedName.split(/\s+/).length < 2) {
    errors.push("Please enter your full name (first and last name)");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
