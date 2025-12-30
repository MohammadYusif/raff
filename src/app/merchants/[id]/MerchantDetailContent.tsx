// src/app/merchants/[id]/MerchantDetailContent.tsx
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
import { Search, ExternalLink, Store, Package } from "lucide-react";
import { ArrowForward, ArrowBackward } from "@/core/i18n";
import { formatPrice } from "@/lib/utils";
import { TrendingUp } from "lucide-react";
import { getMerchantStoreUrl } from "@/lib/platform/store";

interface Product {
  id: string;
  title: string;
  titleAr: string | null;
  slug: string;
  price: number;
  originalPrice: number | null;
  trendingScore: number;
  category: {
    name: string;
    nameAr: string | null;
  } | null;
}

interface Merchant {
  id: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  descriptionAr: string | null;
  logo: string | null;
  sallaStoreUrl: string | null;
  zidStoreUrl: string | null;
  phone: string | null;
  email: string;
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

interface MerchantDetailContentProps {
  merchant: Merchant;
  initialProducts: Product[];
  pagination: Pagination;
}

export function MerchantDetailContent({
  merchant,
  initialProducts,
  pagination,
}: MerchantDetailContentProps) {
  const t = useTranslations("merchant");
  const productsT = useTranslations("products");
  const commonT = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const urlSearchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(
    urlSearchParams.get("search") || ""
  );

  const merchantName =
    locale === "ar" ? merchant.nameAr || merchant.name : merchant.name;
  const merchantDescription =
    locale === "ar"
      ? merchant.descriptionAr || merchant.description
      : merchant.description;
  const storeUrl = getMerchantStoreUrl(merchant);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(urlSearchParams.toString());
    if (searchQuery) {
      params.set("search", searchQuery);
    } else {
      params.delete("search");
    }
    params.delete("page");
    router.push(`/merchants/${merchant.id}?${params.toString()}`);
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

    router.push(`/merchants/${merchant.id}?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(urlSearchParams.toString());
    params.set("page", page.toString());
    router.push(`/merchants/${merchant.id}?${params.toString()}`);
  };

  return (
    <PageLayout>
      <div className="min-h-screen overflow-x-hidden bg-raff-neutral-50">
        {/* Header */}
        <div className="border-b border-raff-neutral-200 bg-white">
          <Container className="py-8">
            <div className="mb-4">
              <Link href="/merchants">
                <Button variant="ghost" className="gap-2 -ms-2">
                  <ArrowBackward className="h-4 w-4" />
                  {t("backToMerchants")}
                </Button>
              </Link>
            </div>

            {/* Merchant Header */}
            <div className="mb-6 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              {/* Merchant Info */}
              <div className="flex items-start gap-4">
                {/* Store Icon */}
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-raff-primary/10 text-4xl">
                  <Store className="h-10 w-10 text-raff-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-start justify-between gap-4">
                    <h1 className="text-3xl font-bold text-raff-primary sm:text-4xl">
                      {merchantName}
                    </h1>
                  </div>
                  {merchantDescription && (
                    <p className="mb-3 text-lg text-raff-neutral-600">
                      {merchantDescription}
                    </p>
                  )}
                  {/* Contact Info */}
                  <div className="flex flex-wrap gap-4 text-sm text-raff-neutral-500">
                    {merchant.phone && <span>📞 {merchant.phone}</span>}
                    {merchant.email && <span>✉️ {merchant.email}</span>}
                  </div>
                </div>
              </div>

              {/* Visit Store Button */}
              <div className="flex shrink-0 flex-col gap-3">
                <Badge variant="secondary" className="text-base">
                  {merchant._count.products} {t("products")}
                </Badge>
                {storeUrl ? (
                  <a href={storeUrl} target="_blank" rel="noopener noreferrer">
                    <Button className="w-full gap-2">
                      {t("visitStore")}
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                ) : (
                  <Button className="w-full gap-2" disabled>
                    {t("visitStore")}
                    <ExternalLink className="h-4 w-4" />
                  </Button>
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
                <Button type="submit" size="icon">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </form>

            {/* Sort & Count */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-raff-neutral-600">
                {productsT("resultsCount", {
                  count: pagination.totalCount ?? initialProducts.length,
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
                  {productsT("sortTrending")}
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
                  {productsT("sortPriceLow")}
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
                  {productsT("sortPriceHigh")}
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
                  {productsT("sortNewest")}
                </Button>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          {initialProducts.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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

                return (
                  <Card
                    key={product.id}
                    className="group overflow-hidden border-raff-neutral-200 hover-lift"
                  >
                    {/* Product Image */}
                    <div className="relative aspect-square overflow-hidden">
                      <div className="flex h-full items-center justify-center from-raff-neutral-50 to-raff-neutral-100">
                        <div className="text-center">
                          <div className="mb-3 text-6xl opacity-40">📦</div>
                          {/* Fixed height container for badge */}
                          <div className="flex h-6 items-center justify-center">
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
                    </div>

                    <CardContent className="p-4">
                      {/* Category */}
                      {categoryName && (
                        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-raff-neutral-500">
                          {categoryName}
                        </div>
                      )}

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
              <Button
                variant="outline"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={!pagination.hasPreviousPage}
              >
                {productsT("previous")}
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
                      variant={page === pagination.page ? "default" : "outline"}
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
                {productsT("next")}
              </Button>
            </div>
          )}
        </Container>
      </div>
    </PageLayout>
  );
}
