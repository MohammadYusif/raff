// src/app/not-found.tsx
"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { Container, Card, CardContent } from "@/shared/components/ui";
import { Home, Search } from "lucide-react";
import { AnimatedButton } from "@/shared/components/AnimatedButton";

export default function NotFound() {
  const t = useTranslations("errors.notFound");
  const commonT = useTranslations("common");

  return (
    <div className="flex min-h-screen items-center justify-center bg-raff-neutral-50">
      <Container>
        <Card className="mx-auto max-w-md">
          <CardContent className="pb-8 pt-12 text-center">
            {/* 404 Icon */}
            <div className="mb-6 text-8xl font-bold text-raff-primary/20">
              404
            </div>

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
              <Link href="/">
                <AnimatedButton size="lg" className="w-full gap-2">
                  <Home className="h-5 w-5" />
                  {commonT("actions.backToHome")}
                </AnimatedButton>
              </Link>

              <Link href="/products">
                <AnimatedButton
                  size="lg"
                  variant="outline"
                  className="w-full gap-2"
                >
                  <Search className="h-5 w-5" />
                  {t("browseProducts")}
                </AnimatedButton>
              </Link>
            </div>
          </CardContent>
        </Card>
      </Container>
    </div>
  );
}
