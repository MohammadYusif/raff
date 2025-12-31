// src/app/cart/page.tsx
"use client";

import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { PageLayout } from "@/shared/components/layouts";
import { Button, Card, CardContent, Container, Badge } from "@/shared/components/ui";
import { ExternalLink, ShoppingCart, Trash2 } from "lucide-react";
import { useCart } from "@/lib/hooks/useCart";
import { useProductClick } from "@/lib/hooks/useProductClick";
import { formatPrice } from "@/lib/utils";

export default function CartPage() {
  const t = useTranslations("cart");
  const productT = useTranslations("product");
  const locale = useLocale();
  const { items, itemCount, removeItem, clearCart } = useCart();
  const { trackAndRedirect, isTracking } = useProductClick();

  const currencies = new Set(items.map((item) => item.currency));
  const hasSingleCurrency = currencies.size <= 1;
  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <PageLayout>
      <div className="min-h-screen bg-raff-neutral-50">
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
              <div className="space-y-4">
                {items.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <Link href={`/products/${item.slug}`}>
                          <h2 className="text-lg font-semibold text-raff-primary hover:text-raff-accent">
                            {item.title}
                          </h2>
                        </Link>
                        <p className="text-sm text-raff-neutral-600">
                          {item.merchantName || t("merchantFallback")}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <Badge variant="secondary">
                            {t("quantity", { count: item.quantity })}
                          </Badge>
                          <span className="text-sm text-raff-neutral-500">
                            {formatPrice(item.price, locale)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:items-end">
                        <Button
                          size="sm"
                          className="gap-2"
                          disabled={isTracking}
                          onClick={() => trackAndRedirect(item.id)}
                        >
                          {productT("buyNow")}
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-2 text-raff-neutral-500"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          {t("remove")}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="h-fit">
                <CardContent className="space-y-4 p-6">
                  <h3 className="text-lg font-semibold text-raff-primary">
                    {t("summaryTitle")}
                  </h3>
                  <div className="flex items-center justify-between text-sm text-raff-neutral-600">
                    <span>{t("itemsLabel", { count: itemCount })}</span>
                    <span>{itemCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-base font-semibold text-raff-primary">
                    <span>{t("total")}</span>
                    <span>
                      {hasSingleCurrency
                        ? formatPrice(total, locale)
                        : t("multiCurrency")}
                    </span>
                  </div>
                  <p className="text-xs text-raff-neutral-500">
                    {t("checkoutNotice")}
                  </p>
                  <Button variant="outline" className="w-full" onClick={clearCart}>
                    {t("clearCart")}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </Container>
      </div>
    </PageLayout>
  );
}
