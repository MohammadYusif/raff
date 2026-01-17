// src/app/error.tsx
"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Container, Card, CardContent } from "@/shared/components/ui";
import { Home, RefreshCw } from "lucide-react";
import { AnimatedButton } from "@/shared/components/AnimatedButton";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorPageProps) {
  const t = useTranslations("errors.serverError");
  const commonT = useTranslations("common");

  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-raff-neutral-50">
      <Container>
        <Card className="mx-auto max-w-md">
          <CardContent className="pb-8 pt-12 text-center">
            {/* Error Icon */}
            <div className="mb-6 text-8xl opacity-40">⚠️</div>

            {/* Title */}
            <h1 className="mb-4 text-3xl font-bold text-raff-primary">
              {t("title")}
            </h1>

            {/* Description */}
            <p className="mb-8 text-lg text-raff-neutral-600">
              {t("description")}
            </p>

            {/* Actions */}
            <div className="space-y-3">
              <AnimatedButton
                size="lg"
                className="w-full gap-2"
                onClick={reset}
              >
                <RefreshCw className="h-5 w-5" />
                {t("tryAgain")}
              </AnimatedButton>

              <Link href="/">
                <AnimatedButton
                  size="lg"
                  variant="outline"
                  className="w-full gap-2"
                >
                  <Home className="h-5 w-5" />
                  {commonT("actions.backToHome")}
                </AnimatedButton>
              </Link>
            </div>

            {/* Error ID for support */}
            {error.digest && (
              <p className="mt-6 text-xs text-raff-neutral-400">
                {t("errorId")}: {error.digest}
              </p>
            )}
          </CardContent>
        </Card>
      </Container>
    </div>
  );
}
