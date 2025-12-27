// src/features/homepage/components/TrendingSection.tsx
"use client";

import { useTranslations, useLocale } from "next-intl";
import {
  Container,
  Card,
  CardContent,
  Button,
  Badge,
} from "@/shared/components/ui";
import { TrendingUp } from "lucide-react";
import Link from "next/link";
import { ArrowForward } from "@/core/i18n";

// Mock data with both languages
const mockProducts = [
  {
    id: "1",
    title: { ar: "سماعات لاسلكية", en: "Wireless Headphones" },
    merchant: { ar: "متجر الإلكترونيات", en: "Electronics Store" },
    price: 299,
  },
  {
    id: "2",
    title: { ar: "حقيبة جلدية فاخرة", en: "Luxury Leather Bag" },
    merchant: { ar: "بوتيك الأزياء", en: "Fashion Boutique" },
    price: 599,
  },
  {
    id: "3",
    title: { ar: "ساعة ذكية", en: "Smart Watch" },
    merchant: { ar: "تك ستور", en: "Tech Store" },
    price: 899,
  },
  {
    id: "4",
    title: { ar: "كاميرا رقمية", en: "Digital Camera" },
    merchant: { ar: "عالم التصوير", en: "Photography World" },
    price: 1299,
  },
];

export function TrendingSection() {
  const t = useTranslations("homepage.trending");
  const commonT = useTranslations("common");
  const locale = useLocale();

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
          {mockProducts.map((product) => (
            <Card
              key={product.id}
              className="group overflow-hidden border-raff-neutral-200"
            >
              {/* Product Image Placeholder */}
              <div className="relative aspect-square overflow-hidden from-raff-neutral-50 to-raff-neutral-100">
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <div className="mb-3 text-6xl opacity-40">📦</div>
                    <Badge variant="default" className="gap-1 bg-raff-primary">
                      <TrendingUp className="h-3 w-3" />
                      {commonT("labels.trending")}
                    </Badge>
                  </div>
                </div>
              </div>

              <CardContent className="p-4">
                {/* Merchant */}
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-raff-neutral-500">
                  {product.merchant[locale as "ar" | "en"]}
                </div>

                {/* Product Title */}
                <h3 className="mb-3 line-clamp-2 text-base font-semibold text-raff-primary">
                  {product.title[locale as "ar" | "en"]}
                </h3>

                {/* Price */}
                <div className="mb-4 text-xl font-bold text-raff-primary">
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
