// src/app/auth/register/RegisterForm.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/shared/components/ui";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function RegisterForm() {
  const t = useTranslations("auth.register");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      toast.error(t("passwordMismatch"));
      setLoading(false);
      return;
    }

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
        toast.error(data?.error || t("error"));
        setLoading(false);
        return;
      }

      toast.success(t("success"));
      router.push("/auth/login");
    } catch (error) {
      console.error("Registration error:", error);
      toast.error(t("error"));
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder={t("namePlaceholder")}
          required
          disabled={loading}
        />
      </div>

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
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder={t("emailPlaceholder")}
          required
          disabled={loading}
        />
      </div>

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
          onChange={(e) =>
            setFormData({ ...formData, password: e.target.value })
          }
          placeholder={t("passwordPlaceholder")}
          required
          disabled={loading}
        />
      </div>

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
          onChange={(e) =>
            setFormData({ ...formData, confirmPassword: e.target.value })
          }
          placeholder={t("confirmPasswordPlaceholder")}
          required
          disabled={loading}
        />
      </div>

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
