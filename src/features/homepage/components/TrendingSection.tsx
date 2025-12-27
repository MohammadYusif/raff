// src/features/homepage/components/TrendingSection.tsx
"use client";

import { useTranslations } from "next-intl";
import { Container, Card, CardContent, Button, Badge } from "@/shared/components/ui";
import { TrendingUp, ArrowRight } from "lucide-react";
import Link from "next/link";
import { ArrowForward } from "@/core/i18n";

// Mock data - will be replaced with real data later
const mockProducts = [
  {
    id: "1",
    title: "سماعات لاسلكية",
    titleEn: "Wireless Headphones",
    price: 299,
    image: "/placeholder-product.jpg",
    merchant: "متجر الإلكترونيات",
    trending: true,
  },
  {
    id: "2",
    title: "حقيبة جلدية فاخرة",
    titleEn: "Luxury Leather Bag",
    price: 599,
    image: "/placeholder-product.jpg",
    merchant: "بوتيك الأزياء",
    trending: true,
  },
  {
    id: "3",
    title: "ساعة ذكية",
    titleEn: "Smart Watch",
    price: 899,
    image: "/placeholder-product.jpg",
    merchant: "تك ستور",
    trending: true,
  },
  {
    id: "4",
    title: "كاميرا رقمية",
    titleEn: "Digital Camera",
    price: 1299,
    image: "/placeholder-product.jpg",
    merchant: "عالم التصوير",
    trending: true,
  },
];

export function TrendingSection() {
  const t = useTranslations("homepage.trending");
  const commonT = useTranslations("common");

  return (
    <section className="py-16 sm:py-24">
      <Container>
        {/* Section Header */}
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-raff-accent/10 px-4 py-2 text-sm font-medium text-raff-accent">
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
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {mockProducts.map((product) => (
            <Card
              key={product.id}
              className="group overflow-hidden transition-all hover:shadow-lg"
            >
              {/* Product Image */}
              <div className="relative aspect-square overflow-hidden bg-raff-neutral-100">
                <div className="flex h-full items-center justify-center text-raff-neutral-400">
                  {/* Placeholder - will be replaced with actual image */}
                  <div className="text-6xl">📦</div>
                </div>
                {product.trending && (
                  <Badge
                    variant="accent"
                    className="absolute start-3 top-3 gap-1"
                  >
                    <TrendingUp className="h-3 w-3" />
                    {commonT("labels.trending")}
                  </Badge>
                )}
              </div>

              <CardContent className="p-4">
                {/* Merchant */}
                <div className="mb-2 text-xs text-raff-neutral-500">
                  {product.merchant}
                </div>

                {/* Product Title */}
                <h3 className="mb-2 line-clamp-2 font-semibold text-raff-primary">
                  {product.title}
                </h3>

                {/* Price */}
                <div className="mb-4 text-lg font-bold text-raff-accent">
                  {product.price} {commonT("labels.sar")}
                </div>

                {/* View Button */}
                <Button variant="outline" className="w-full gap-2" size="sm">
                  {commonT("actions.viewDetails")}
                  <ArrowForward className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* View All Button */}
        <div className="mt-12 text-center">
          <Button size="lg" variant="outline" asChild>
            <Link href="/trending" className="gap-2">
              {t("viewAll")}
              <ArrowForward className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </Container>
    </section>
  );
}
