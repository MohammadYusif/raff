// src/app/products/ProductsContent.tsx
"use client";

import { useState, useEffect } from "react";
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
import { TrendingUp, Search, SlidersHorizontal, X } from "lucide-react";
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

interface Category {
  id: string;
  name: string;
  nameAr: string | null;
  slug: string;
  _count: {
    products: number;
  };
}

interface Pagination {
  page: number;
  limit: number;
  totalPages: number;
  totalCount?: number;
  totalItems?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
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
  const locale = useLocale();
  const router = useRouter();
  const urlSearchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(
    urlSearchParams.get("search") || ""
  );

  // ✅ Auto-search after user stops typing for 1 second
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(urlSearchParams.toString());

      if (searchQuery.trim()) {
        // User typed something - add search param
        params.set("search", searchQuery.trim());
      } else {
        // User cleared search - remove search param to show all products
        params.delete("search");
      }

      // Reset to page 1 when search changes
      params.delete("page");

      // Only navigate if the search param actually changed
      const currentSearch = urlSearchParams.get("search") || "";
      if (currentSearch !== searchQuery.trim()) {
        router.push(`/products?${params.toString()}`);
      }
    }, 1000); // Wait 1 second after user stops typing

    return () => clearTimeout(timer);
  }, [searchQuery, router, urlSearchParams]);

  // ✅ Sync input with URL when URL changes (e.g., back button)
  useEffect(() => {
    const urlSearch = urlSearchParams.get("search") || "";
    setSearchQuery((prev) => (prev === urlSearch ? prev : urlSearch));
  }, [urlSearchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Manual submit - trigger immediately
    const params = new URLSearchParams(urlSearchParams.toString());
    if (searchQuery.trim()) {
      params.set("search", searchQuery.trim());
    } else {
      params.delete("search");
    }
    params.delete("page");
    router.push(`/products?${params.toString()}`);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    // Will auto-trigger useEffect to remove search param
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

    if (currentSort === sortBy) {
      params.delete("sortBy");
      params.delete("page");
    } else {
      params.set("sortBy", sortBy);
      params.delete("page");
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
      <div className="min-h-screen overflow-x-hidden bg-raff-neutral-50">
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
          <div className="flex max-w-full flex-col gap-8 lg:flex-row">
            {/* Sidebar Filters */}
            <aside className="w-full shrink-0 lg:w-64">
              <Card className="overflow-hidden">
                <CardContent className="space-y-6 p-6">
                  {/* Search */}
                  <div>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-raff-primary">
                      <Search className="h-4 w-4" />
                      {t("search")}
                    </h3>
                    <form onSubmit={handleSearch}>
                      <div className="relative">
                        <Input
                          type="text"
                          placeholder={t("searchPlaceholder")}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pe-10"
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={handleClearSearch}
                            className="absolute end-3 top-1/2 -translate-y-1/2 text-raff-neutral-400 hover:text-raff-neutral-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
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
                          !urlSearchParams.get("category")
                            ? "default"
                            : "outline"
                        }
                        size="sm"
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
                                : "outline"
                            }
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => handleCategoryFilter(category.slug)}
                          >
                            <span className="truncate">{categoryName}</span>
                            <Badge
                              variant="secondary"
                              className="ms-auto shrink-0"
                            >
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
            <div className="flex-1">
              {/* Sort & Results Count */}
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-raff-neutral-600">
                  {t("resultsCount", {
                    count:
                      pagination.totalCount ||
                      pagination.totalItems ||
                      initialProducts.length,
                  })}
                </p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  <Button
                    variant={
                      urlSearchParams.get("sortBy") === "trending"
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    className="shrink-0"
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
                    className="shrink-0"
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
                    className="shrink-0"
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
                    className="shrink-0"
                    onClick={() => handleSort("newest")}
                  >
                    {t("sortNewest")}
                  </Button>
                </div>
              </div>

              {/* Products Grid */}
              {initialProducts.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {initialProducts.map((product) => {
                      const productTitle =
                        locale === "ar"
                          ? product.titleAr || product.title
                          : product.title;
                      const merchantName =
                        locale === "ar"
                          ? product.merchant.nameAr || product.merchant.name
                          : product.merchant.name;
                      const categoryName = product.category
                        ? locale === "ar"
                          ? product.category.nameAr || product.category.name
                          : product.category.name
                        : null;

                      return (
                        <Card
                          key={product.id}
                          className="group flex h-full flex-col overflow-hidden transition-all duration-300 hover:shadow-lg"
                        >
                          <CardContent className="flex h-full flex-col p-0">
                            {/* Product Image Placeholder */}
                            <Link href={`/products/${product.slug}`}>
                              <div className="relative aspect-square overflow-hidden bg-raff-neutral-100 transition-transform duration-300 group-hover:scale-105">
                                <div className="flex h-full items-center justify-center text-6xl opacity-40">
                                  📦
                                </div>
                                {product.trendingScore > 70 && (
                                  <div className="absolute start-3 top-3">
                                    <Badge className="gap-1 bg-raff-accent text-white">
                                      <TrendingUp className="h-3 w-3" />
                                      {commonT("labels.trending")}
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            </Link>

                            {/* Product Info - Flex Container */}
                            <div className="flex flex-1 flex-col p-4">
                              {/* Content Area - Grows to fill space */}
                              <div className="flex-1">
                                {categoryName && (
                                  <p className="mb-1 text-xs text-raff-neutral-500">
                                    {categoryName}
                                  </p>
                                )}
                                <Link href={`/products/${product.slug}`}>
                                  <h3 className="mb-2 line-clamp-2 text-base font-semibold text-raff-primary transition-colors hover:text-raff-accent">
                                    {productTitle}
                                  </h3>
                                </Link>
                                <p className="mb-3 text-sm text-raff-neutral-600">
                                  {merchantName}
                                </p>

                                {/* Price */}
                                <div className="mb-4">
                                  <span className="text-lg font-bold text-raff-primary">
                                    {formatPrice(product.price, locale)}
                                  </span>
                                  {product.originalPrice &&
                                    product.originalPrice > product.price && (
                                      <span className="ms-2 text-sm text-raff-neutral-400 line-through">
                                        {formatPrice(
                                          product.originalPrice,
                                          locale
                                        )}
                                      </span>
                                    )}
                                </div>
                              </div>

                              {/* View Details Button - Always at Bottom */}
                              <Link
                                href={`/products/${product.slug}`}
                                className="block"
                              >
                                <Button
                                  variant="outline"
                                  className="group/btn w-full transition-all hover:bg-raff-primary hover:text-white hover:border-raff-primary"
                                  size="sm"
                                >
                                  <span className="flex-1">
                                    {commonT("actions.viewDetails")}
                                  </span>
                                  <ArrowForward className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                                </Button>
                              </Link>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Pagination - unchanged */}
                  {pagination.totalPages > 1 && (
                    <div className="mt-8 flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={
                          pagination.page === 1 ||
                          pagination.hasPreviousPage === false
                        }
                      >
                        <ArrowBackward className="h-4 w-4" />
                        {t("previous")}
                      </Button>

                      <span className="text-sm text-raff-neutral-600">
                        {pagination.page} / {pagination.totalPages}
                      </span>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={
                          pagination.page >= pagination.totalPages ||
                          pagination.hasNextPage === false
                        }
                      >
                        {t("next")}
                        <ArrowForward className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="py-16 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-raff-neutral-100">
                      <Search className="h-8 w-8 text-raff-neutral-400" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-raff-primary">
                      {t("noResults")}
                    </h3>
                    <p className="mb-4 text-raff-neutral-600">
                      {t("noResultsDescription")}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </Container>
      </div>
    </PageLayout>
  );
}
