// src/app/cart/CartContent.tsx
"use client";

import { useTranslations, useLocale } from "next-intl";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import {
  Container,
  Card,
  CardContent,
  Badge,
  Skeleton,
} from "@/shared/components/ui";
import {
  ShoppingCart,
  Trash2,
  AlertCircle,
  ExternalLink,
  Plus,
  Minus,
} from "lucide-react";
import { ArrowForward, ArrowBackward } from "@/core/i18n";
import { useCart } from "@/lib/hooks/useCart";
import { formatPrice } from "@/lib/utils";
import { TrendingUp } from "lucide-react";
import { AnimatedButton } from "@/shared/components/AnimatedButton";
import { toast } from "sonner";

/**
 * CartContent Component
 *
 * Enhanced with:
 * - Quantity controls (increase/decrease)
 * - Item subtotal display
 * - Improved mobile UX
 */
export function CartContent() {
  const t = useTranslations("cart");
  const commonT = useTranslations("common");
  const { data: session, status } = useSession();
  const { items, itemCount, removeItem, clearCart, updateQuantity } = useCart();
  const locale = useLocale();

  const showAuthNotice =
    status === "unauthenticated" ||
    (status === "authenticated" && session?.user?.role !== "CUSTOMER");

  // Calculate totals by currency
  const totalsByCurrency = items.reduce(
    (acc, item) => {
      const currency = item.currency || "SAR";
      if (!acc[currency]) {
        acc[currency] = 0;
      }
      acc[currency] += item.price * item.quantity;
      return acc;
    },
    {} as Record<string, number>
  );

  const hasMultipleCurrencies = Object.keys(totalsByCurrency).length > 1;

  // Handle quantity changes
  const handleQuantityChange = (
    itemId: string,
    currentQuantity: number,
    change: number
  ) => {
    const newQuantity = currentQuantity + change;

    if (newQuantity < 1) {
      // If trying to go below 1, remove the item
      removeItem(itemId);
      toast.success(
        locale === "ar" ? "تم الحذف من السلة" : "Removed from cart",
        {
          description:
            locale === "ar"
              ? "تم حذف المنتج من سلة التسوق"
              : "Item removed from cart",
        }
      );
    } else if (newQuantity > 99) {
      // Maximum quantity limit
      toast.error(
        locale === "ar" ? "الحد الأقصى 99" : "Maximum quantity is 99",
        {
          description:
            locale === "ar"
              ? "لا يمكنك إضافة أكثر من 99 قطعة"
              : "You cannot add more than 99 items",
        }
      );
    } else {
      updateQuantity(itemId, newQuantity);
    }
  };

  // Show full loading skeleton during session transitions
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-raff-neutral-50">
        <div className="border-b border-raff-neutral-200 bg-white">
          <Container className="py-6 md:py-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-raff-primary/10 md:h-12 md:w-12">
                <ShoppingCart className="h-5 w-5 text-raff-primary md:h-6 md:w-6" />
              </div>
              <div>
                <Skeleton
                  variant="shimmer"
                  className="mb-2 h-7 w-32 md:h-8 md:w-40"
                />
                <Skeleton variant="shimmer" className="h-4 w-20" />
              </div>
            </div>
          </Container>
        </div>

        <Container className="py-8 md:py-12">
          <div className="mx-auto max-w-2xl">
            <Card className="overflow-hidden">
              <CardContent className="p-8 md:p-12">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-6 rounded-full bg-raff-neutral-100 p-8">
                    <Skeleton
                      variant="shimmer"
                      className="h-16 w-16 rounded-full md:h-20 md:w-20"
                    />
                  </div>
                  <Skeleton
                    variant="shimmer"
                    className="mb-3 h-9 w-64 md:h-10 md:w-80"
                  />
                  <Skeleton
                    variant="shimmer"
                    className="mb-8 h-6 w-48 md:w-64"
                  />
                  <Skeleton variant="shimmer" className="h-11 w-48" />
                </div>
              </CardContent>
            </Card>
          </div>
        </Container>
      </div>
    );
  }

  // Empty cart
  if (itemCount === 0) {
    return (
      <div className="min-h-screen bg-raff-neutral-50">
        <div className="border-b border-raff-neutral-200 bg-white">
          <Container className="py-8">
            <div className="mb-4">
              <Link href="/products">
                <AnimatedButton variant="ghost" className="gap-2 -ms-2">
                  <ArrowBackward className="h-4 w-4" />
                  {commonT("actions.backToHome")}
                </AnimatedButton>
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-raff-primary sm:text-4xl">
              {t("title")}
            </h1>
          </Container>
        </div>

        <Container className="py-8">
          {/* Auth Notice - AT TOP */}
          {showAuthNotice && (
            <Card className="mb-8 border-2 border-raff-accent from-raff-accent/5 to-raff-accent/10">
              <CardContent className="p-6 md:p-8">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-8">
                  <div className="flex shrink-0 items-center justify-center rounded-full bg-raff-accent/20 p-4">
                    <AlertCircle className="h-8 w-8 text-raff-accent" />
                  </div>
                  <div className="flex-1">
                    <h3 className="mb-2 text-xl font-bold text-raff-primary">
                      {t("authNoticeTitle")}
                    </h3>
                    <p className="text-raff-neutral-700">
                      {t("authNoticeDescription")}
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Link href="/auth/register">
                      <AnimatedButton className="w-full sm:w-auto">
                        {t("registerCta")}
                      </AnimatedButton>
                    </Link>
                    <Link href="/auth/login">
                      <AnimatedButton
                        variant="outline"
                        className="w-full sm:w-auto"
                      >
                        {t("loginCta")}
                      </AnimatedButton>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty Cart Section */}
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="mb-6 rounded-full bg-raff-neutral-100 p-8">
                <ShoppingCart className="h-16 w-16 text-raff-neutral-400" />
              </div>
              <h2 className="mb-3 text-3xl font-bold text-raff-neutral-900">
                {t("emptyTitle")}
              </h2>
              <p className="mb-8 text-lg text-raff-neutral-600">
                {t("emptyDescription")}
              </p>
              <Link href="/products">
                <AnimatedButton size="lg">
                  {t("continueShopping")}
                  <ArrowForward className="ms-2 h-5 w-5" />
                </AnimatedButton>
              </Link>
            </CardContent>
          </Card>
        </Container>
      </div>
    );
  }

  // Cart with items
  return (
    <div className="min-h-screen bg-raff-neutral-50">
      {/* Header */}
      <div className="border-b border-raff-neutral-200 bg-white">
        <Container className="py-8">
          <div className="mb-4">
            <Link href="/products">
              <AnimatedButton variant="ghost" className="gap-2 -ms-2">
                <ArrowBackward className="h-4 w-4" />
                {commonT("actions.continueShopping")}
              </AnimatedButton>
            </Link>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-raff-primary sm:text-4xl">
                {t("title")}
              </h1>
              <p className="mt-2 text-base text-raff-neutral-600">
                {t("itemCount", { count: itemCount })}
              </p>
            </div>
            {itemCount > 0 && (
              <AnimatedButton
                variant="outline"
                onClick={clearCart}
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="me-2 h-5 w-5" />
                {t("clearCart")}
              </AnimatedButton>
            )}
          </div>
        </Container>
      </div>

      <Container className="py-8">
        {/* Auth Notice */}
        {showAuthNotice && (
          <Card className="mb-8 border-2 border-raff-accent from-raff-accent/5 to-raff-accent/10">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-8">
                <div className="flex shrink-0 items-center justify-center rounded-full bg-raff-accent/20 p-4">
                  <AlertCircle className="h-8 w-8 text-raff-accent" />
                </div>
                <div className="flex-1">
                  <h3 className="mb-2 text-xl font-bold text-raff-primary">
                    {t("authNoticeTitle")}
                  </h3>
                  <p className="text-raff-neutral-700">
                    {t("authNoticeDescription")}
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link href="/auth/register">
                    <AnimatedButton className="w-full sm:w-auto">
                      {t("registerCta")}
                    </AnimatedButton>
                  </Link>
                  <Link href="/auth/login">
                    <AnimatedButton
                      variant="outline"
                      className="w-full sm:w-auto"
                    >
                      {t("loginCta")}
                    </AnimatedButton>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* Cart Items */}
          <div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => {
                const itemName =
                  locale === "ar" && item.nameAr ? item.nameAr : item.name;
                const merchantName =
                  locale === "ar" && item.merchantNameAr
                    ? item.merchantNameAr
                    : item.merchantName;
                const categoryName =
                  locale === "ar" && item.categoryNameAr
                    ? item.categoryNameAr
                    : item.categoryName;

                const itemSubtotal = item.price * item.quantity;

                return (
                  <Card
                    key={item.id}
                    className="group flex h-full flex-col overflow-hidden transition-all duration-300 hover:shadow-lg"
                  >
                    <CardContent className="flex h-full flex-col p-0">
                      {/* Product Image */}
                      <Link href={`/products/${item.slug}`}>
                        <div className="relative aspect-square overflow-hidden bg-raff-neutral-100 transition-transform duration-300 group-hover:scale-105">
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={itemName}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center from-raff-primary/10 to-raff-accent/10">
                              <ShoppingCart className="h-16 w-16 text-raff-neutral-400" />
                            </div>
                          )}

                          {/* Trending Badge */}
                          {item.trendingScore && item.trendingScore > 0 && (
                            <Badge
                              className={`absolute top-3 gap-1 bg-raff-accent text-white shadow-lg ${
                                locale === "ar" ? "left-3" : "right-3"
                              }`}
                            >
                              <TrendingUp className="h-3 w-3" />
                              {commonT("labels.trending")}
                            </Badge>
                          )}
                        </div>
                      </Link>

                      {/* Product Info */}
                      <div className="flex flex-1 flex-col gap-3 p-4">
                        {/* Category */}
                        {categoryName && (
                          <Badge
                            variant="secondary"
                            className="w-fit text-xs font-medium"
                          >
                            {categoryName}
                          </Badge>
                        )}

                        {/* Title */}
                        <Link href={`/products/${item.slug}`}>
                          <h3
                            className="line-clamp-2 text-base font-semibold text-raff-primary transition-colors group-hover:text-raff-accent"
                            dir={locale === "ar" ? "rtl" : "ltr"}
                          >
                            {itemName}
                          </h3>
                        </Link>

                        {/* Merchant */}
                        <p className="text-sm text-raff-neutral-600">
                          {merchantName || t("merchantFallback")}
                        </p>

                        {/* Price & Quantity Controls */}
                        <div className="mt-auto space-y-3">
                          {/* Unit Price */}
                          <div className="flex items-baseline justify-between">
                            <span className="text-sm text-raff-neutral-600">
                              {t("unitPrice")}
                            </span>
                            <span className="font-semibold text-raff-primary">
                              {formatPrice(
                                item.price,
                                locale,
                                item.currency || "SAR"
                              )}
                            </span>
                          </div>

                          {/* Quantity Controls */}
                          <div className="flex items-center justify-between rounded-lg border border-raff-neutral-200 bg-raff-neutral-50 p-2">
                            <span className="text-sm font-medium text-raff-neutral-700">
                              {t("quantity", { count: "" })}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() =>
                                  handleQuantityChange(
                                    item.id,
                                    item.quantity,
                                    -1
                                  )
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-md border border-raff-neutral-300 bg-white text-raff-primary transition-colors hover:bg-raff-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                                aria-label={
                                  locale === "ar"
                                    ? "تقليل الكمية"
                                    : "Decrease quantity"
                                }
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="text-center font-bold text-raff-primary">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  handleQuantityChange(
                                    item.id,
                                    item.quantity,
                                    1
                                  )
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-md border border-raff-neutral-300 bg-white text-raff-primary transition-colors hover:bg-raff-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={item.quantity >= 99}
                                aria-label={
                                  locale === "ar"
                                    ? "زيادة الكمية"
                                    : "Increase quantity"
                                }
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {/* Item Subtotal */}
                          <div className="flex items-baseline justify-between border-t border-raff-neutral-200 pt-2">
                            <span className="text-sm font-medium text-raff-neutral-700">
                              {t("subtotal")}
                            </span>
                            <span className="text-lg font-bold text-raff-accent">
                              {formatPrice(
                                itemSubtotal,
                                locale,
                                item.currency || "SAR"
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Remove Button */}
                        <AnimatedButton
                          variant="outline"
                          size="sm"
                          className="w-full text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="me-2 h-4 w-4" />
                          {t("remove")}
                        </AnimatedButton>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          {itemCount > 0 && (
            <div>
              <Card className="sticky top-4">
                <CardContent className="p-6">
                  <h2 className="mb-4 text-xl font-bold text-raff-primary">
                    {t("summaryTitle")}
                  </h2>

                  <div className="mb-4 space-y-2">
                    <div className="flex justify-between text-raff-neutral-700">
                      <span>{t("itemsLabel")}</span>
                      <span>{itemCount}</span>
                    </div>

                    <div className="border-t border-raff-neutral-200 pt-2">
                      <div className="flex justify-between font-bold text-raff-primary">
                        <span>{t("total")}</span>
                        <div className="text-end">
                          {hasMultipleCurrencies ? (
                            <>
                              <div className="text-sm text-raff-neutral-500">
                                {t("multiCurrency")}
                              </div>
                              {Object.entries(totalsByCurrency).map(
                                ([currency, total]) => (
                                  <div key={currency}>
                                    {formatPrice(total, locale, currency)}
                                  </div>
                                )
                              )}
                            </>
                          ) : (
                            <span>
                              {formatPrice(
                                Object.values(totalsByCurrency)[0] || 0,
                                locale,
                                Object.keys(totalsByCurrency)[0] || "SAR"
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg bg-raff-neutral-50 p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-raff-accent" />
                      <p className="text-sm text-raff-neutral-700">
                        {t("checkoutNotice")}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    {items.map((item) => (
                      <a
                        key={item.id}
                        href={item.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <AnimatedButton
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          {locale === "ar" && item.merchantNameAr
                            ? item.merchantNameAr
                            : item.merchantName}
                          <ExternalLink className="ms-2 h-4 w-4" />
                        </AnimatedButton>
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}
