// src/app/products/[slug]/not-found.tsx
"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { Container, Button, Card, CardContent } from "@/shared/components/ui";
import { Search, Home } from "lucide-react";

export default function ProductNotFound() {
  const t = useTranslations("product.notFound");
  const commonT = useTranslations("common");

  return (
    <div className="min-h-screen bg-raff-neutral-50 flex items-center justify-center">
      <Container>
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-12 pb-8 text-center">
            {/* Icon */}
            <div className="mb-6 text-8xl opacity-40">📦</div>

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
              <Link href="/products">
                <Button size="lg" className="w-full gap-2">
                  <Search className="h-5 w-5" />
                  {t("browseProducts")}
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
