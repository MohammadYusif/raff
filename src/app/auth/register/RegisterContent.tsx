// src/app/auth/register/RegisterContent.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { RegisterForm } from "./RegisterForm";
import { Container, Card, CardContent } from "@/shared/components/ui";
import { AnimatedButton } from "@/shared/components/AnimatedButton";

/**
 * Register Content Component
 *
 * Provides the registration interface with:
 * - Centered layout for focused authentication experience
 * - Logo and branding
 * - Registration form with name/email/password/confirm password
 * - Links to login and home page
 *
 * Note: This component intentionally doesn't use PageLayout to provide
 * a distraction-free authentication experience without navbar/footer.
 */
export function RegisterContent() {
  const t = useTranslations("auth.register");
  const actionsT = useTranslations("common.actions");

  return (
    <div className="flex min-h-screen items-center justify-center bg-raff-neutral-50">
      <Container maxWidth="sm">
        <div className="mb-4">
          <Link href="/">
            <AnimatedButton variant="ghost">{actionsT("backToHome")}</AnimatedButton>
          </Link>
        </div>
        <Card className="border-raff-neutral-200">
          <CardContent className="p-8">
            <div className="mb-8 text-center">
              <Link href="/">
                <Image
                  src="/logo.svg"
                  alt="Raff Logo"
                  width={160}
                  height={40}
                  sizes="160px"
                  priority
                  fetchPriority="high"
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

            <RegisterForm />

            <div className="mt-6 text-center text-sm text-raff-neutral-600">
              {t("loginPrompt")}{" "}
              <Link
                href="/auth/login"
                className="font-semibold text-raff-primary hover:underline"
              >
                {t("loginCta")}
              </Link>
            </div>
          </CardContent>
        </Card>
      </Container>
    </div>
  );
}
