// src/app/categories/[slug]/CategoryDetailContent.tsx
"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageLayout } from "@/shared/components/layouts";
import {
  Container,
  Card,
  CardContent,
  Badge,
  Input,
} from "@/shared/components/ui";
import { ProductCard } from "@/shared/components/ProductCard";
import { Search, Package } from "lucide-react";
import { ArrowBackward } from "@/core/i18n";
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
}

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

interface Pagination {
  page: number;
  limit: number;
  totalPages: number;
  totalCount?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

interface CategoryDetailContentProps {
  category: Category;
  initialProducts: Product[];
  pagination: Pagination;
}

export function CategoryDetailContent({
  category,
  initialProducts,
  pagination,
}: CategoryDetailContentProps) {
  const t = useTranslations("category");
  const productsT = useTranslations("products");
  const commonT = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const urlSearchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(
    urlSearchParams.get("search") || ""
  );

  const categoryName =
    locale === "ar" ? category.nameAr || category.name : category.name;
  const categoryDescription =
    locale === "ar"
      ? category.descriptionAr || category.description
      : category.description;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(urlSearchParams.toString());
    if (searchQuery) {
      params.set("search", searchQuery);
    } else {
      params.delete("search");
    }
    params.delete("page");
    router.push(`/categories/${category.slug}?${params.toString()}`);
  };

  const handleSort = (sortBy: string) => {
    const params = new URLSearchParams(urlSearchParams.toString());
    const currentSort = params.get("sortBy");

    if (currentSort === sortBy) {
      params.delete("sortBy");
      params.delete("page");
    } else {
      params.set("sortBy", sortBy);
      params.delete("page");
    }

    router.push(`/categories/${category.slug}?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(urlSearchParams.toString());
    params.set("page", page.toString());
    router.push(`/categories/${category.slug}?${params.toString()}`);
  };

  return (
    <PageLayout>
      <div className="min-h-screen overflow-x-hidden bg-raff-neutral-50">
        {/* Header */}
        <div className="border-b border-raff-neutral-200 bg-white">
          <Container className="py-8">
            <div className="mb-4">
              <Link href="/categories">
                <AnimatedButton variant="ghost" className="gap-2 -ms-2">
                  <ArrowBackward className="h-4 w-4" />
                  {t("backToCategories")}
                </AnimatedButton>
              </Link>
            </div>

            {/* Category Header */}
            <div className="mb-4 flex items-start gap-4">
              {/* Icon */}
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-raff-primary/10 text-4xl">
                {category.icon || "📦"}
              </div>
              {/* Title and Description - Flex 1 */}
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-start justify-between gap-4">
                  <h1 className="text-3xl font-bold text-raff-primary sm:text-4xl">
                    {categoryName}
                  </h1>
                  {/* Product Count Badge */}
                  <Badge variant="secondary" className="shrink-0 text-base">
                    {category._count.products}
                  </Badge>
                </div>
                {categoryDescription && (
                  <p className="text-lg text-raff-neutral-600">
                    {categoryDescription}
                  </p>
                )}
              </div>
            </div>
          </Container>
        </div>

        <Container className="py-8">
          {/* Search & Sort */}
          <div className="mb-6 space-y-4">
            {/* Search */}
            <form onSubmit={handleSearch}>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-raff-neutral-400" />
                  <Input
                    type="search"
                    placeholder={productsT("searchPlaceholder")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="ps-10"
                  />
                </div>
                <AnimatedButton type="submit" size="icon">
                  <Search className="h-4 w-4" />
                </AnimatedButton>
              </div>
            </form>

            {/* Sort & Count */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-raff-neutral-600">
                {productsT("resultsCount", {
                  count:
                    pagination.totalCount ??
                    pagination.totalCount ??
                    initialProducts.length,
                })}
              </p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                <AnimatedButton
                  variant={
                    urlSearchParams.get("sortBy") === "trending"
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  className="shrink-0"
                  onClick={() => handleSort("trending")}
                >
                  {productsT("sortTrending")}
                </AnimatedButton>
                <AnimatedButton
                  variant={
                    urlSearchParams.get("sortBy") === "price_low"
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  className="shrink-0"
                  onClick={() => handleSort("price_low")}
                >
                  {productsT("sortPriceLow")}
                </AnimatedButton>
                <AnimatedButton
                  variant={
                    urlSearchParams.get("sortBy") === "price_high"
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  className="shrink-0"
                  onClick={() => handleSort("price_high")}
                >
                  {productsT("sortPriceHigh")}
                </AnimatedButton>
                <AnimatedButton
                  variant={
                    urlSearchParams.get("sortBy") === "newest"
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  className="shrink-0"
                  onClick={() => handleSort("newest")}
                >
                  {productsT("sortNewest")}
                </AnimatedButton>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          {initialProducts.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {initialProducts.map((product, index) => (
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
                <Package className="mx-auto mb-4 h-16 w-16 text-raff-neutral-400" />
                <h3 className="mb-2 text-xl font-semibold text-raff-primary">
                  {t("noProducts")}
                </h3>
                <p className="text-raff-neutral-600">
                  {t("noProductsDescription")}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <AnimatedButton
                variant="outline"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={!pagination.hasPreviousPage}
              >
                {productsT("previous")}
              </AnimatedButton>

              {[...Array(pagination.totalPages)].map((_, i) => {
                const page = i + 1;
                if (
                  page === 1 ||
                  page === pagination.totalPages ||
                  Math.abs(page - pagination.page) <= 1
                ) {
                  return (
                    <AnimatedButton
                      key={page}
                      variant={page === pagination.page ? "default" : "outline"}
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </AnimatedButton>
                  );
                } else if (
                  page === pagination.page - 2 ||
                  page === pagination.page + 2
                ) {
                  return <span key={page}>...</span>;
                }
                return null;
              })}

              <AnimatedButton
                variant="outline"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={!pagination.hasNextPage}
              >
                {productsT("next")}
              </AnimatedButton>
            </div>
          )}
        </Container>
      </div>
    </PageLayout>
  );
}