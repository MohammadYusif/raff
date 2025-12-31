// src/app/auth/login/LoginContent.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { LoginForm } from "./LoginForm";
import { Container, Card, CardContent, Button } from "@/shared/components/ui";

/**
 * Login Content Component
 *
 * Provides the login interface with:
 * - Centered layout for focused authentication experience
 * - Logo and branding
 * - Login form with email/password
 * - Links to registration and home page
 *
 * Note: This component intentionally doesn't use PageLayout to provide
 * a distraction-free authentication experience without navbar/footer.
 */
export function LoginContent() {
  const t = useTranslations("auth.login");
  const actionsT = useTranslations("common.actions");

  return (
    <div className="flex min-h-screen items-center justify-center bg-raff-neutral-50">
      <Container maxWidth="sm">
        <div className="mb-4">
          <Link href="/">
            <Button variant="ghost">{actionsT("backToHome")}</Button>
          </Link>
        </div>
        <Card className="border-raff-neutral-200">
          <CardContent className="p-8">
            <div className="mb-8 text-center">
              <Link href="/">
                <Image
                  src="/logo.png"
                  alt="Raff Logo"
                  width={160}
                  height={40}
                  className="mx-auto h-auto w-40 object-contain"
                />
              </Link>
              <h1 className="mt-4 text-2xl font-bold text-raff-primary">
                {t("title")}
              </h1>
              <p className="mt-2 text-sm text-raff-neutral-600">
                {t("subtitle")}
              </p>
            </div>

            <LoginForm />

            <div className="mt-6 text-center text-sm text-raff-neutral-600">
              {t("registerPrompt")}{" "}
              <Link
                href="/auth/register"
                className="font-semibold text-raff-primary hover:underline"
              >
                {t("registerCta")}
              </Link>
            </div>
          </CardContent>
        </Card>
      </Container>
    </div>
  );
}
