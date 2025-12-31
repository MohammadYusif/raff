// src/app/cart/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { useSession } from "next-auth/react";
import { PageLayout } from "@/shared/components/layouts";
import {
  Button,
  Card,
  CardContent,
  Container,
  Badge,
  Skeleton,
} from "@/shared/components/ui";
import { ShoppingCart, TrendingUp, Trash2 } from "lucide-react";
import { ArrowForward } from "@/core/i18n";
import { useCart } from "@/lib/hooks/useCart";
import { formatPrice } from "@/lib/utils";

/**
 * Cart Page
 *
 * Displays the user's shopping cart with products in a grid layout matching
 * the products page design for consistency.
 * Shows authentication notice for non-customer users (unauthenticated, merchants, admins).
 * Uses PageLayout for consistent navigation experience.
 */

export default function CartPage() {
  const t = useTranslations("cart");
  const productT = useTranslations("product");
  const commonT = useTranslations("common");
  const locale = useLocale();
  const { data: session, status } = useSession();
  const { items, itemCount, removeItem, clearCart } = useCart();

  // Internal loading state to show skeleton on initial mount
  const [isLoading, setIsLoading] = useState(true);

  // Wait for session to load and cart to be ready
  useEffect(() => {
    if (status !== "loading") {
      // Add small delay to ensure smooth transition
      const timer = setTimeout(() => setIsLoading(false), 100);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const currencies = new Set(items.map((item) => item.currency));
  const hasSingleCurrency = currencies.size <= 1;
  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  /**
   * Show auth notice for:
   * - Unauthenticated users (need to login/register)
   * - Merchants/Admins (currently shown notice, may need separate cart functionality in future)
   */
  const showAuthNotice =
    status === "unauthenticated" ||
    (status === "authenticated" && session?.user?.role !== "CUSTOMER");

  // Show loading skeleton while session is loading or initial mount
  if (isLoading || status === "loading") {
    return (
      <PageLayout>
        <div className="min-h-screen bg-raff-neutral-50">
          {/* Header Skeleton */}
          <div className="border-b border-raff-neutral-200 bg-white">
            <Container className="py-8">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="mb-2 h-9 w-32" />
                  <Skeleton className="h-5 w-24" />
                </div>
              </div>
            </Container>
          </div>

          <Container className="py-8">
            {/* Auth Notice Skeleton */}
            <Card className="mb-6">
              <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1">
                  <Skeleton className="mb-2 h-6 w-48" />
                  <Skeleton className="h-4 w-64" />
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 w-32" />
                </div>
              </CardContent>
            </Card>

            {/* Main Grid Layout Skeleton */}
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              {/* Products Grid */}
              <div>
                {/* Summary Info Skeleton */}
                <div className="mb-6 flex items-center justify-between">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-9 w-24" />
                </div>

                {/* Product Cards Grid */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="overflow-hidden">
                      <Skeleton className="aspect-square w-full" />
                      <CardContent className="space-y-3 p-4">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-6 w-24" />
                        <Skeleton className="h-9 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Summary Sidebar Skeleton */}
              <aside className="lg:sticky lg:top-24 lg:h-fit">
                <Card>
                  <CardContent className="space-y-4 p-6">
                    <Skeleton className="h-7 w-32" />
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-5 w-16" />
                      </div>
                      <div className="flex justify-between">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-5 w-16" />
                      </div>
                    </div>
                    <div className="border-t border-raff-neutral-200 pt-4">
                      <div className="mb-4 flex justify-between">
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-6 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              </aside>
            </div>
          </Container>
        </div>
      </PageLayout>
    );
  }

  // Main cart content
  return (
    <PageLayout>
      <div className="min-h-screen bg-raff-neutral-50">
        {/* Header */}
        <div className="border-b border-raff-neutral-200 bg-white">
          <Container className="py-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-raff-neutral-100">
                <ShoppingCart className="h-6 w-6 text-raff-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-raff-primary">
                  {t("title")}
                </h1>
                <p className="text-sm text-raff-neutral-600">
                  {t("itemCount", { count: itemCount })}
                </p>
              </div>
            </div>
          </Container>
        </div>

        <Container className="py-8">
          {/* Auth Notice - Now shows after loading */}
          {showAuthNotice && (
            <Card className="mb-6">
              <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-raff-primary">
                    {t("authNoticeTitle")}
                  </h2>
                  <p className="text-sm text-raff-neutral-600">
                    {t("authNoticeDescription")}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Link href="/auth/login">
                    <Button variant="outline">{t("loginCta")}</Button>
                  </Link>
                  <Link href="/auth/register">
                    <Button>{t("registerCta")}</Button>
                  </Link>
                  <Link href="/products">
                    <Button variant="outline">{t("continueShopping")}</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty Cart State */}
          {items.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-raff-neutral-100">
                  <ShoppingCart className="h-8 w-8 text-raff-neutral-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-raff-primary">
                  {t("emptyTitle")}
                </h3>
                <p className="mb-6 text-raff-neutral-600">
                  {t("emptyDescription")}
                </p>
                <Link href="/products">
                  <Button>{t("continueShopping")}</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              {/* Products Grid - Same as Products Page */}
              <div>
                {/* Summary Info */}
                <div className="mb-6 flex items-center justify-between">
                  <p className="text-sm text-raff-neutral-600">
                    {t("itemCount", { count: itemCount })}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearCart}
                    className="text-red-500 hover:bg-red-50 hover:text-red-600"
                  >
                    {t("clearCart")}
                  </Button>
                </div>

                {/* Products Grid - Matching Products Page Layout */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((item) => {
                    const productTitle =
                      locale === "ar" && item.nameAr ? item.nameAr : item.name;
                    const merchantName = item.merchantName;
                    const categoryName = item.categoryName;

                    return (
                      <Card
                        key={item.id}
                        className="group relative overflow-hidden border-raff-neutral-200 hover-lift"
                      >
                        {/* Remove Button - Top Right */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                          className="absolute right-2 top-2 z-10 h-8 w-8 rounded-full bg-white/90 text-red-500 shadow-sm hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>

                        {/* Product Image - Same as Products Page */}
                        <Link href={`/products/${item.slug}`}>
                          <div className="relative aspect-square overflow-hidden">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={productTitle}
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center from-raff-neutral-50 to-raff-neutral-100">
                                <div className="text-center">
                                  <div className="mb-3 text-6xl opacity-40">
                                    📦
                                  </div>
                                  {/* Fixed height container for badge */}
                                  <div className="flex h-6 items-center justify-center">
                                    {item.trendingScore &&
                                      item.trendingScore > 70 && (
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
                            )}
                          </div>
                        </Link>

                        {/* Product Info - Matching Products Page */}
                        <CardContent className="flex flex-1 flex-col p-4">
                          <div className="flex-1">
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
                            <Link href={`/products/${item.slug}`}>
                              <h3 className="mb-3 line-clamp-2 text-base font-semibold text-raff-primary transition-colors hover:text-raff-accent">
                                {productTitle}
                              </h3>
                            </Link>

                            {/* Price */}
                            <div className="mb-4">
                              <span className="text-xl font-bold text-raff-primary">
                                {formatPrice(item.price, item.currency)}
                              </span>
                              {item.quantity > 1 && (
                                <span className="ms-2 text-sm text-raff-neutral-600">
                                  × {item.quantity}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* View on Store Button */}
                          <a
                            href={item.externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full"
                          >
                            <Button
                              variant="outline"
                              className="w-full gap-2"
                              size="sm"
                            >
                              {productT("viewOnStore")}
                              <ArrowForward className="h-4 w-4" />
                            </Button>
                          </a>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Summary Sidebar - Sticky */}
              <aside className="lg:sticky lg:top-24 lg:h-fit">
                <Card>
                  <CardContent className="space-y-4 p-6">
                    <h3 className="text-lg font-semibold text-raff-primary">
                      {t("summary")}
                    </h3>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-raff-neutral-600">
                          {t("items")}
                        </span>
                        <span className="font-medium text-raff-primary">
                          {itemCount}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-raff-neutral-600">
                          {t("subtotal")}
                        </span>
                        <span className="font-medium text-raff-primary">
                          {hasSingleCurrency
                            ? formatPrice(total, items[0]?.currency || "SAR")
                            : t("multipleCurrencies")}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-raff-neutral-200 pt-4">
                      <div className="mb-4 flex justify-between">
                        <span className="font-semibold text-raff-primary">
                          {t("total")}
                        </span>
                        <span className="text-lg font-bold text-raff-primary">
                          {hasSingleCurrency
                            ? formatPrice(total, items[0]?.currency || "SAR")
                            : t("multipleCurrencies")}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-raff-neutral-500">
                      {t("checkoutNotice")}
                    </p>

                    <div className="space-y-2">
                      <Link href="/products" className="block">
                        <Button variant="outline" className="w-full">
                          {t("continueShopping")}
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </aside>
            </div>
          )}
        </Container>
      </div>
    </PageLayout>
  );
}
