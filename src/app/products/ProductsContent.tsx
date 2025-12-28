// src/app/products/ProductsContent.tsx
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
  Button,
  Badge,
  Input,
} from "@/shared/components/ui";
import { TrendingUp, Search, SlidersHorizontal } from "lucide-react";
import { ArrowForward, ArrowBackward } from "@/core/i18n";
import { formatPrice } from "@/lib/utils";

interface Product {
  id: string;
  title: string;
  titleAr?: string;
  slug: string;
  price: number;
  originalPrice?: number;
  trendingScore: number;
  merchant: {
    name: string;
    nameAr?: string;
  };
  category: {
    name: string;
    nameAr?: string;
  } | null;
}

interface Category {
  id: string;
  name: string;
  nameAr?: string;
  slug: string;
  _count: {
    products: number;
  };
}

interface Pagination {
  page: number;
  limit: number;
  totalPages: number;
  totalItems?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

interface ProductsContentProps {
  initialProducts: Product[];
  pagination: Pagination;
  categories: Category[];
}

export function ProductsContent({
  initialProducts,
  pagination,
  categories,
}: ProductsContentProps) {
  const t = useTranslations("products");
  const commonT = useTranslations("common");
  const locale = useLocale(); // Get current locale
  const router = useRouter();
  const urlSearchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(
    urlSearchParams.get("search") || ""
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(urlSearchParams.toString());
    if (searchQuery) {
      params.set("search", searchQuery);
    } else {
      params.delete("search");
    }
    params.delete("page");
    router.push(`/products?${params.toString()}`);
  };

  const handleCategoryFilter = (categorySlug: string | null) => {
    const params = new URLSearchParams(urlSearchParams.toString());
    if (categorySlug) {
      params.set("category", categorySlug);
    } else {
      params.delete("category");
    }
    params.delete("page");
    router.push(`/products?${params.toString()}`);
  };

  const handleSort = (sortBy: string) => {
    const params = new URLSearchParams(urlSearchParams.toString());
    const currentSort = params.get("sortBy");

    // Toggle: if clicking the active sort, remove it
    if (currentSort === sortBy) {
      params.delete("sortBy");
    } else {
      params.set("sortBy", sortBy);
    }

    router.push(`/products?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(urlSearchParams.toString());
    params.set("page", page.toString());
    router.push(`/products?${params.toString()}`);
  };

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
            <h1 className="mb-4 text-3xl font-bold text-raff-primary sm:text-4xl">
              {t("title")}
            </h1>
            <p className="text-lg text-raff-neutral-600">{t("subtitle")}</p>
          </Container>
        </div>

        <Container className="py-8">
          <div className="grid gap-8 lg:grid-cols-4">
            {/* Sidebar Filters */}
            <aside className="lg:col-span-1">
              <Card>
                <CardContent className="p-6 space-y-6">
                  {/* Search */}
                  <div>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-raff-primary">
                      <Search className="h-4 w-4" />
                      {t("search")}
                    </h3>
                    <form onSubmit={handleSearch}>
                      <div className="flex gap-2">
                        <Input
                          type="search"
                          placeholder={t("searchPlaceholder")}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="flex-1"
                        />
                        <Button type="submit" size="icon">
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>
                    </form>
                  </div>

                  {/* Categories Filter */}
                  <div>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-raff-primary">
                      <SlidersHorizontal className="h-4 w-4" />
                      {t("categories")}
                    </h3>
                    <div className="space-y-2">
                      <Button
                        variant={
                          !urlSearchParams.get("category") ? "default" : "ghost"
                        }
                        className="w-full justify-start"
                        onClick={() => handleCategoryFilter(null)}
                      >
                        {t("allCategories")}
                      </Button>
                      {categories.map((category) => {
                        const categoryName =
                          locale === "ar"
                            ? category.nameAr || category.name
                            : category.name;

                        return (
                          <Button
                            key={category.id}
                            variant={
                              urlSearchParams.get("category") === category.slug
                                ? "default"
                                : "ghost"
                            }
                            className="w-full justify-between"
                            onClick={() => handleCategoryFilter(category.slug)}
                          >
                            <span>{categoryName}</span>
                            <Badge variant="secondary" className="text-xs">
                              {category._count.products}
                            </Badge>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </aside>

            {/* Main Content */}
            <div className="lg:col-span-3 space-y-6">
              {/* Sort & Results Count */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-sm text-raff-neutral-600">
                  {t("resultsCount", {
                    count: pagination.totalItems ?? initialProducts.length,
                  })}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant={
                      urlSearchParams.get("sortBy") === "trending"
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() => handleSort("trending")}
                  >
                    {t("sortTrending")}
                  </Button>
                  <Button
                    variant={
                      urlSearchParams.get("sortBy") === "price_low"
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() => handleSort("price_low")}
                  >
                    {t("sortPriceLow")}
                  </Button>
                  <Button
                    variant={
                      urlSearchParams.get("sortBy") === "price_high"
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() => handleSort("price_high")}
                  >
                    {t("sortPriceHigh")}
                  </Button>
                  <Button
                    variant={
                      urlSearchParams.get("sortBy") === "newest"
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() => handleSort("newest")}
                  >
                    {t("sortNewest")}
                  </Button>
                </div>
              </div>

              {/* Products Grid */}
              {initialProducts.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {initialProducts.map((product) => {
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
                        className="group overflow-hidden border-raff-neutral-200"
                      >
                        {/* Product Image */}
                        <div className="relative aspect-square overflow-hidden">
                          <div className="flex h-full items-center justify-center from-raff-neutral-50 to-raff-neutral-100">
                            <div className="text-center">
                              <div className="mb-3 text-6xl opacity-40">📦</div>
                              {product.trendingScore > 70 && (
                                <Badge
                                  variant="default"
                                  className="gap-1 bg-raff-primary"
                                >
                                  <TrendingUp className="h-3 w-3" />
                                  {commonT("labels.trending")}
                                </Badge>
                              )}
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
                    <div className="mb-4 text-6xl opacity-40">🔍</div>
                    <h3 className="mb-2 text-xl font-semibold text-raff-primary">
                      {t("noResults")}
                    </h3>
                    <p className="text-raff-neutral-600">
                      {t("noResultsDescription")}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={!pagination.hasPrevPage}
                  >
                    {t("previous")}
                  </Button>

                  {[...Array(pagination.totalPages)].map((_, i) => {
                    const page = i + 1;
                    if (
                      page === 1 ||
                      page === pagination.totalPages ||
                      Math.abs(page - pagination.page) <= 1
                    ) {
                      return (
                        <Button
                          key={page}
                          variant={
                            page === pagination.page ? "default" : "outline"
                          }
                          onClick={() => handlePageChange(page)}
                        >
                          {page}
                        </Button>
                      );
                    } else if (
                      page === pagination.page - 2 ||
                      page === pagination.page + 2
                    ) {
                      return <span key={page}>...</span>;
                    }
                    return null;
                  })}

                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={!pagination.hasNextPage}
                  >
                    {t("next")}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Container>
      </div>
    </PageLayout>
  );
}
