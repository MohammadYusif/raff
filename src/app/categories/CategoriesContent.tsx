// src/app/categories/CategoriesContent.tsx
"use client";

import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { PageLayout } from "@/shared/components/layouts";
import {
  Container,
  Card,
  CardContent,
  Badge,
} from "@/shared/components/ui";
import { ArrowForward, ArrowBackward } from "@/core/i18n";
import { Package } from "lucide-react";
import { AnimatedButton } from "@/shared/components/AnimatedButton";

interface Category {
  id: string;
  name: string;
  nameAr: string | null;
  slug: string;
  description: string | null;
  descriptionAr: string | null;
  icon: string | null;
  _count: {
    products: number;
  };
}

interface CategoriesContentProps {
  categories: Category[];
}

export function CategoriesContent({ categories }: CategoriesContentProps) {
  const t = useTranslations("categories");
  const commonT = useTranslations("common");
  const locale = useLocale();

  return (
    <PageLayout>
      <div className="min-h-screen overflow-x-hidden bg-raff-neutral-50">
        {/* Header */}
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
            <h1 className="mb-4 text-3xl font-bold text-raff-primary sm:text-4xl">
              {t("title")}
            </h1>
            <p className="text-lg text-raff-neutral-600">{t("subtitle")}</p>
          </Container>
        </div>

        <Container className="py-8">
          {/* Categories Grid */}
          {categories.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => {
                const categoryName =
                  locale === "ar"
                    ? category.nameAr || category.name
                    : category.name;
                const categoryDescription =
                  locale === "ar"
                    ? category.descriptionAr || category.description
                    : category.description;

                return (
                  <Link key={category.id} href={`/categories/${category.slug}`}>
                    <Card className="group h-full transition-all hover:shadow-lg">
                      <CardContent className="flex h-full flex-col p-6">
                        {/* Icon & Title */}
                        <div className="mb-4 flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            {/* Category Icon */}
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-raff-primary/10 text-2xl transition-colors group-hover:bg-raff-primary/20">
                              {category.icon || "📦"}
                            </div>
                            {/* Category Name */}
                            <div>
                              <h3 className="text-lg font-semibold text-raff-primary group-hover:text-raff-accent">
                                {categoryName}
                              </h3>
                            </div>
                          </div>

                          {/* Product Count Badge */}
                          <Badge variant="secondary" className="shrink-0">
                            {category._count.products}
                          </Badge>
                        </div>

                        {/* Description */}
                        {categoryDescription && (
                          <p className="mb-4 line-clamp-2 flex-1 text-sm text-raff-neutral-600">
                            {categoryDescription}
                          </p>
                        )}

                        {/* View Products Link */}
                        <div className="flex items-center gap-2 text-sm font-medium text-raff-accent">
                          {t("viewProducts")}
                          <ArrowForward
                            className={`h-4 w-4 transition-transform ${
                              locale === "ar"
                                ? "group-hover:-translate-x-1"
                                : "group-hover:translate-x-1"
                            }`}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Package className="mx-auto mb-4 h-16 w-16 text-raff-neutral-400" />
                <h3 className="mb-2 text-xl font-semibold text-raff-primary">
                  {t("noCategories")}
                </h3>
                <p className="text-raff-neutral-600">
                  {t("noCategoriesDescription")}
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