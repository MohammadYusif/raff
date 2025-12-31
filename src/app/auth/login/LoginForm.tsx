// src/app/auth/login/LoginForm.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { getSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/shared/components/ui";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function LoginForm() {
  const t = useTranslations("auth.login");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error(result.error);
        setLoading(false);
        return;
      }

      if (result?.ok) {
        toast.success(t("success"));
        const session = await getSession();
        const role = session?.user?.role;
        if (role === "MERCHANT" || role === "ADMIN") {
          router.push("/merchant/dashboard");
        } else {
          router.push("/");
        }
        router.refresh();
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
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder={t("emailPlaceholder")}
          required
          disabled={loading}
        />
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
          onChange={(e) =>
            setFormData({ ...formData, password: e.target.value })
          }
          placeholder={t("passwordPlaceholder")}
          required
          disabled={loading}
        />
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
