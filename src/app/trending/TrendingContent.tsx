// src/app/trending/TrendingContent.tsx
"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { PageLayout } from "@/shared/components/layouts";
import {
  Container,
  Card,
  CardContent,
} from "@/shared/components/ui";
import { ProductCard } from "@/shared/components/ProductCard";
import { TrendingUp, Flame } from "lucide-react";
import { ArrowForward, ArrowBackward } from "@/core/i18n";
import { AnimatedButton } from "@/shared/components/AnimatedButton";

interface Product {
  id: string;
  title: string;
  titleAr: string | null;
  slug: string;
  price: number;
  originalPrice: number | null;
  trendingScore: number;
  merchant: {
    name: string;
    nameAr: string | null;
  };
  category: {
    name: string;
    nameAr: string | null;
  } | null;
}

interface TrendingContentProps {
  products: Product[];
}

export function TrendingContent({ products }: TrendingContentProps) {
  const t = useTranslations("trending");
  const commonT = useTranslations("common");

  return (
    <PageLayout>
      <div className="min-h-screen bg-raff-neutral-50">
        {/* Header with Back Button */}
        <div className="border-b border-raff-neutral-200 bg-white">
          <Container className="py-8">
            <div className="mb-4">
              <Link href="/">
                <AnimatedButton variant="ghost" className="gap-2 -ms-2">
                  <ArrowBackward className="h-4 w-4" />
                  {commonT("actions.backToHome")}
                </AnimatedButton>
              </Link>
            </div>

            {/* Title with Flame Icon */}
            <div className="mb-4 flex items-center gap-3">
              <Flame className="h-8 w-8 text-raff-accent sm:h-10 sm:w-10" />
              <h1 className="text-3xl font-bold text-raff-primary sm:text-4xl">
                {t("title")}
              </h1>
            </div>
            <p className="text-lg text-raff-neutral-600">{t("subtitle")}</p>
          </Container>
        </div>

        <Container className="py-8">
          {/* Info Badge */}
          <div className="mb-8 rounded-lg border border-raff-accent/20 bg-raff-accent/5 p-4">
            <p className="text-sm text-raff-neutral-700">
              <TrendingUp className="me-2 inline h-4 w-4" />
              {t("description")}
            </p>
          </div>

          {/* Products Grid */}
          {products.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={index}
                  showCategory={true}
                  commonT={commonT}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="mb-4 text-6xl opacity-40">📊</div>
                <h3 className="mb-2 text-xl font-semibold text-raff-primary">
                  {t("noTrending")}
                </h3>
                <p className="text-raff-neutral-600">
                  {t("noTrendingDescription")}
                </p>
              </CardContent>
            </Card>
          )}

          {/* View All Products Link */}
          <div className="mt-12 text-center">
            <Link href="/products">
              <AnimatedButton size="lg" variant="outline" className="gap-2">
                {t("viewAllProducts")}
                <ArrowForward className="h-5 w-5" />
              </AnimatedButton>
            </Link>
          </div>
        </Container>
      </div>
    </PageLayout>
  );
}