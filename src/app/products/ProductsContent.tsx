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
  Badge,
  Input,
} from "@/shared/components/ui";
import { ProductCard } from "@/shared/components/ProductCard";
import {
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { ArrowForward, ArrowBackward } from "@/core/i18n";
import type { ProductWithCartFields } from "@/types";
import { AnimatedButton } from "@/shared/components/AnimatedButton";
import { StaggerContainer } from "@/shared/components/PageTransition";
import { getLocalizedText } from "@/lib/utils";

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
  initialProducts: ProductWithCartFields[];
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
                          <AnimatedButton
                            type="button"
                            onClick={handleClearSearch}
                            unstyled
                            className="absolute end-3 top-1/2 -translate-y-1/2 text-raff-neutral-400 hover:text-raff-neutral-600"
                          >
                            <X className="h-4 w-4" />
                          </AnimatedButton>
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
                      <AnimatedButton
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
                      </AnimatedButton>
                      {categories.map((category) => {
                        const categoryName = getLocalizedText(
                          locale,
                          category.nameAr,
                          category.name
                        );
                        return (
                          <AnimatedButton
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
                          </AnimatedButton>
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
                    {t("sortTrending")}
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
                    {t("sortPriceLow")}
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
                    {t("sortPriceHigh")}
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
                    {t("sortNewest")}
                  </AnimatedButton>
                </div>
              </div>

              {/* Products Grid */}
              {initialProducts.length > 0 ? (
                <>
                  <StaggerContainer className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {initialProducts.map((product, index) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        index={index}
                        showCategory={true}
                      />
                    ))}
                  </StaggerContainer>

                  {/* Pagination - unchanged */}
                  {pagination.totalPages > 1 && (
                    <div className="mt-8 flex items-center justify-center gap-2">
                      <AnimatedButton
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
                      </AnimatedButton>

                      <span className="text-sm text-raff-neutral-600">
                        {pagination.page} / {pagination.totalPages}
                      </span>

                      <AnimatedButton
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
                      </AnimatedButton>
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
