// src/app/trending/TrendingContent.tsx
"use client";

import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { PageLayout } from "@/shared/components/layouts";
import {
  Container,
  Card,
  CardContent,
  Button,
  Badge,
} from "@/shared/components/ui";
import { TrendingUp, Flame } from "lucide-react";
import { ArrowForward, ArrowBackward } from "@/core/i18n";
import { formatPrice } from "@/lib/utils";

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
  const locale = useLocale();

  return (
    <PageLayout>
      <div className="min-h-screen bg-raff-neutral-50">
        {/* Header with Back Button */}
        <div className="border-b border-raff-neutral-200 bg-white">
          <Container className="py-8">
            <div className="mb-4">
              <Link href="/">
                <Button variant="ghost" className="gap-2 -ms-2">
                  <ArrowBackward className="h-4 w-4" />
                  {commonT("actions.backToHome")}
                </Button>
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
              {products.map((product, index) => {
                const productTitle =
                  locale === "ar"
                    ? product.titleAr || product.title
                    : product.title;
                const categoryName = product.category
                  ? locale === "ar"
                    ? product.category.nameAr || product.category.name
                    : product.category.name
                  : null;
                const merchantName =
                  locale === "ar"
                    ? product.merchant.nameAr || product.merchant.name
                    : product.merchant.name;

                return (
                  <Card
                    key={product.id}
                    className="group relative overflow-hidden border-raff-neutral-200"
                  >
                    {/* Trending Rank Badge */}
                    <div className="absolute start-3 top-3 z-10">
                      <Badge
                        variant="default"
                        className="gap-1 bg-raff-accent text-white shadow-lg"
                      >
                        <Flame className="h-3 w-3" />#{index + 1}
                      </Badge>
                    </div>

                    {/* Product Image */}
                    <div className="relative aspect-square overflow-hidden">
                      <div className="flex h-full items-center justify-center from-raff-neutral-50 to-raff-neutral-100">
                        <div className="text-center">
                          <div className="mb-3 text-6xl opacity-40">📦</div>
                          {/* Fixed height container for badge */}
                          <div className="flex h-6 items-center justify-center">
                            <Badge
                              variant="default"
                              className="gap-1 bg-raff-primary"
                            >
                              <TrendingUp className="h-3 w-3" />
                              {commonT("labels.trending")}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    <CardContent className="p-4">
                      {/* Category */}
                      {categoryName && (
                        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-raff-neutral-500">
                          {categoryName}
                        </div>
                      )}

                      {/* Merchant */}
                      <div className="mb-2 text-xs text-raff-neutral-500">
                        {merchantName}
                      </div>

                      {/* Title */}
                      <h3 className="mb-3 line-clamp-2 text-base font-semibold text-raff-primary">
                        {productTitle}
                      </h3>

                      {/* Price */}
                      <div className="mb-4">
                        {product.originalPrice && (
                          <span className="me-2 text-sm text-raff-neutral-500 line-through">
                            {formatPrice(product.originalPrice, locale)}
                          </span>
                        )}
                        <span className="text-xl font-bold text-raff-primary">
                          {formatPrice(product.price, locale)}
                        </span>
                      </div>

                      {/* View Button */}
                      <Link href={`/products/${product.slug}`}>
                        <Button
                          variant="outline"
                          className="w-full gap-2"
                          size="sm"
                        >
                          {commonT("actions.viewDetails")}
                          <ArrowForward className="h-4 w-4" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
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
              <Button size="lg" variant="outline" className="gap-2">
                {t("viewAllProducts")}
                <ArrowForward className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </Container>
      </div>
    </PageLayout>
  );
}
