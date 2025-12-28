// src/app/categories/[slug]/not-found.tsx
"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { Container, Button, Card, CardContent } from "@/shared/components/ui";
import { Package, Home } from "lucide-react";

export default function CategoryNotFound() {
  const t = useTranslations("category.notFound");
  const commonT = useTranslations("common");

  return (
    <div className="flex min-h-screen items-center justify-center bg-raff-neutral-50">
      <Container>
        <Card className="mx-auto max-w-md">
          <CardContent className="pb-8 pt-12 text-center">
            {/* Icon */}
            <Package className="mx-auto mb-6 h-20 w-20 text-raff-neutral-400" />

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
              <Link href="/categories">
                <Button size="lg" className="w-full gap-2">
                  <Package className="h-5 w-5" />
                  {t("browseCategories")}
                </Button>
              </Link>

              <Link href="/">
                <Button size="lg" variant="outline" className="w-full gap-2">
                  <Home className="h-5 w-5" />
                  {commonT("actions.backToHome")}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </Container>
    </div>
  );
}
