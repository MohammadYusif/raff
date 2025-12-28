// src/features/homepage/components/TrendingSection.tsx
"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Container,
  Card,
  CardContent,
  Button,
  Badge,
  Skeleton,
} from "@/shared/components/ui";
import { TrendingUp } from "lucide-react";
import Link from "next/link";
import { ArrowForward } from "@/core/i18n";
import { formatPrice } from "@/lib/utils";

interface Product {
  id: string;
  title: string;
  titleAr?: string;
  slug: string;
  price: number;
  originalPrice?: number;
  merchant: {
    name: string;
    nameAr?: string;
  };
}

export function TrendingSection() {
  const t = useTranslations("homepage.trending");
  const commonT = useTranslations("common");
  const locale = useLocale(); // ← Add locale

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch("/api/products/trending?limit=8");
        const data = await response.json();
        setProducts(data.products);
      } catch (error) {
        console.error("Failed to load trending products:", error);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  if (loading) {
    return (
      <section className="border-y border-raff-neutral-200 bg-white py-16 sm:py-24">
        <Container>
          <div className="mb-12 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-raff-primary/5 px-4 py-2 text-sm font-medium text-raff-primary">
              <TrendingUp className="h-4 w-4" />
              {commonT("labels.trending")}
            </div>
            <h2 className="mb-4 text-3xl font-bold text-raff-primary sm:text-4xl">
              {t("title")}
            </h2>
          </div>

          {/* Loading skeleton using shadcn Skeleton */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-square w-full" />
                <CardContent className="space-y-3 p-4">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-6 w-1/2" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </Container>
      </section>
    );
  }

  return (
    <section className="border-y border-raff-neutral-200 bg-white py-16 sm:py-24">
      <Container>
        {/* Section Header */}
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-raff-primary/5 px-4 py-2 text-sm font-medium text-raff-primary">
            <TrendingUp className="h-4 w-4" />
            {commonT("labels.trending")}
          </div>
          <h2 className="mb-4 text-3xl font-bold text-raff-primary sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-raff-neutral-600">
            {t("subtitle")}
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => {
            // ← Add locale-aware display
            const productTitle =
              locale === "ar"
                ? product.titleAr || product.title
                : product.title;
            const merchantName =
              locale === "ar"
                ? product.merchant.nameAr || product.merchant.name
                : product.merchant.name;

            return (
              <Card
                key={product.id}
                className="group overflow-hidden border-raff-neutral-200"
              >
                {/* Product Image Placeholder */}
                <div className="relative aspect-square overflow-hidden from-raff-neutral-50 to-raff-neutral-100">
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                      <div className="mb-3 text-6xl opacity-40">📦</div>
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

                <CardContent className="p-4">
                  {/* Merchant */}
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-raff-neutral-500">
                    {merchantName}
                  </div>

                  {/* Product Title */}
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

        {/* View All Button */}
        <div className="mt-12 text-center">
          <Link href="/trending">
            <Button size="lg" variant="outline" className="gap-2">
              {t("viewAll")}
              <ArrowForward className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </Container>
    </section>
  );
}
