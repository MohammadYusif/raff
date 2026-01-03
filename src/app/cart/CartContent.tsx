// src/app/cart/CartContent.tsx
"use client";

import { useTranslations, useLocale } from "next-intl";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Container,
  Card,
  CardContent,
  Button,
  Badge,
} from "@/shared/components/ui";
import { ShoppingCart, Trash2, AlertCircle, ExternalLink } from "lucide-react";
import { ArrowForward, ArrowBackward } from "@/core/i18n";
import { useCart } from "@/lib/hooks/useCart";
import { formatPrice } from "@/lib/utils";
import { TrendingUp } from "lucide-react";

/**
 * CartContent Component
 *
 * Uses the unified useCart hook for cart management
 */
export function CartContent() {
  const t = useTranslations("cart");
  const commonT = useTranslations("common");
  const { data: session, status } = useSession();
  const { items, itemCount, removeItem, clearCart } = useCart();
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

  // Empty cart
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-raff-neutral-50">
        <div className="border-b border-raff-neutral-200 bg-white">
          <Container className="py-8">
            <div className="mb-4">
              <Link href="/products">
                <Button variant="ghost" className="gap-2 -ms-2">
                  <ArrowBackward className="h-4 w-4" />
                  {commonT("actions.backToHome")}
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-raff-primary sm:text-4xl">
              {t("title")}
            </h1>
          </Container>
        </div>

        <Container className="py-8">
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
                <Button size="lg">
                  {t("continueShopping")}
                  <ArrowForward className="ms-2 h-5 w-5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-raff-neutral-50">
      {/* Header */}
      <div className="border-b border-raff-neutral-200 bg-white">
        <Container className="py-8">
          <div className="mb-4">
            <Link href="/products">
              <Button variant="ghost" className="gap-2 -ms-2">
                <ArrowBackward className="h-4 w-4" />
                {commonT("actions.continueShopping")}
              </Button>
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
            <Button
              variant="outline"
              onClick={clearCart}
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="me-2 h-5 w-5" />
              {t("clearCart")}
            </Button>
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
                    <Button className="w-full sm:w-auto">
                      {t("registerCta")}
                    </Button>
                  </Link>
                  <Link href="/auth/login">
                    <Button variant="outline" className="w-full sm:w-auto">
                      {t("loginCta")}
                    </Button>
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
                            <img
                              src={item.image}
                              alt={itemName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-6xl opacity-40">
                              📦
                            </div>
                          )}
                          {item.trendingScore && item.trendingScore > 70 && (
                            <div className="absolute start-3 top-3">
                              <Badge className="gap-1 bg-raff-accent text-white">
                                <TrendingUp className="h-3 w-3" />
                                {commonT("labels.trending")}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </Link>

                      {/* Product Info */}
                      <div className="flex flex-1 flex-col p-4">
                        <div className="flex-1">
                          {categoryName && (
                            <p className="mb-1 text-xs text-raff-neutral-500">
                              {categoryName}
                            </p>
                          )}
                          <Link href={`/products/${item.slug}`}>
                            <h3 className="mb-2 line-clamp-2 text-base font-semibold text-raff-primary transition-colors hover:text-raff-accent">
                              {itemName}
                            </h3>
                          </Link>
                          <p className="mb-3 text-sm text-raff-neutral-600">
                            {merchantName || t("merchantFallback")}
                          </p>

                          <div className="mb-4">
                            <span className="text-lg font-bold text-raff-primary">
                              {formatPrice(item.price, locale)}
                            </span>
                            <p className="mt-1 text-sm text-raff-neutral-500">
                              {t("quantity", { count: item.quantity })}
                            </p>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="me-2 h-4 w-4" />
                          {t("remove")}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Summary */}
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
                              Object.values(totalsByCurrency)[0],
                              locale,
                              Object.keys(totalsByCurrency)[0]
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
                      <Button variant="outline" size="sm" className="w-full">
                        {locale === "ar" && item.merchantNameAr
                          ? item.merchantNameAr
                          : item.merchantName}
                        <ExternalLink className="ms-2 h-4 w-4" />
                      </Button>
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Container>
    </div>
  );
}
