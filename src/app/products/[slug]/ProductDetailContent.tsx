// src/app/products/[slug]/ProductDetailContent.tsx
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
import {
  TrendingUp,
  ExternalLink,
  Package,
  Loader2,
  ShoppingCart,
} from "lucide-react";
import { ArrowBackward } from "@/core/i18n";
import { formatPrice, getLocalizedText } from "@/lib/utils";
import { getMerchantStoreUrl } from "@/lib/platform/store";
import { useProductClick } from "@/lib/hooks/useProductClick"; // ✅ NEW
import { useCart } from "@/lib/hooks/useCart";
import { toast } from "sonner";
import type { ProductWithCartFields } from "@/types";
import { AnimatedButton } from "@/shared/components/AnimatedButton";

interface ProductDetailContentProps {
  product: ProductWithCartFields;
}

export function ProductDetailContent({ product }: ProductDetailContentProps) {
  const t = useTranslations("product");
  const commonT = useTranslations("common");
  const locale = useLocale();

  // ✅ NEW: Use click tracking hook
  const { trackAndRedirect, isTracking } = useProductClick();
  const { addItem } = useCart();

  const productTitle = getLocalizedText(
    locale,
    product.titleAr,
    product.title
  );
  const merchantName = getLocalizedText(
    locale,
    product.merchant.nameAr,
    product.merchant.name
  );
  const categoryName = product.category
    ? getLocalizedText(
        locale,
        product.category.nameAr,
        product.category.name
      )
    : null;
  const description = getLocalizedText(
    locale,
    product.descriptionAr,
    product.description
  );

  const storeUrl = getMerchantStoreUrl(
    product.merchant.sallaStoreUrl,
    product.merchant.zidStoreUrl
  );

  // ✅ NEW: Handle buy now click
  const handleBuyNow = () => {
    // TODO: Get userId from session when we implement customer auth
    trackAndRedirect(product.id);
  };

  const handleAddToCart = () => {
    addItem(
      {
        id: product.id,
        slug: product.slug,
        name: product.title,
        nameAr: product.titleAr,
        image: product.imageUrl || null,
        price: Number(product.price),
        currency: product.currency,
        merchantName,
        merchantNameAr: product.merchant.nameAr,
        categoryName,
        categoryNameAr: product.category?.nameAr,
        externalUrl: product.externalUrl,
        trendingScore: product.trendingScore,
      },
      1
    );
    toast.success(t("addedToCart"));
  };

  return (
    <PageLayout>
      <div className="min-h-screen bg-raff-neutral-50">
        {/* Header */}
        <div className="border-b border-raff-neutral-200 bg-white">
          <Container className="py-8">
            <div className="mb-4">
              <Link href="/products">
                <AnimatedButton variant="ghost" className="gap-2 -ms-2">
                  <ArrowBackward className="h-4 w-4" />
                  {t("backToProducts")}
                </AnimatedButton>
              </Link>
            </div>
          </Container>
        </div>

        <Container className="py-8">
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Product Image */}
            <div className="relative aspect-square overflow-hidden rounded-lg bg-raff-neutral-100">
              <div className="flex h-full items-center justify-center text-9xl opacity-40">
                📦
              </div>
              {product.trendingScore > 70 && (
                <div className="absolute start-4 top-4">
                  <Badge className="gap-1 bg-raff-accent text-white">
                    <TrendingUp className="h-3 w-3" />
                    {commonT("labels.trending")}
                  </Badge>
                </div>
              )}
            </div>

            {/* Product Info */}
            <div>
              {/* Category */}
              {categoryName && (
                <Link href={`/categories/${product.category?.slug}`}>
                  <Badge variant="secondary" className="mb-4">
                    {categoryName}
                  </Badge>
                </Link>
              )}

              {/* Title */}
              <h1 className="mb-4 text-3xl font-bold text-raff-primary sm:text-4xl">
                {productTitle}
              </h1>

              {/* Merchant */}
              <Link href={`/merchants/${product.merchant.id}`}>
                <p className="mb-6 text-lg text-raff-neutral-600 hover:text-raff-primary">
                  {merchantName}
                </p>
              </Link>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-bold text-raff-primary">
                    {formatPrice(product.price, locale)}
                  </span>
                  {product.originalPrice &&
                    product.originalPrice > product.price && (
                      <span className="text-xl text-raff-neutral-400 line-through">
                        {formatPrice(product.originalPrice, locale)}
                      </span>
                    )}
                </div>
                <p className="mt-2 text-sm text-raff-neutral-500">
                  {t("taxIncluded")}
                </p>
              </div>

              {/* Stock Status */}
              <div className="mb-6">
                {product.inStock ? (
                  <Badge variant="default" className="bg-green-500">
                    <Package className="me-1 h-3 w-3" />
                    {product.quantity && product.quantity < 10
                      ? t("limitedStock", { count: product.quantity })
                      : t("inStock")}
                  </Badge>
                ) : (
                  <Badge variant="error">
                    <Package className="me-1 h-3 w-3" />
                    {t("outOfStock")}
                  </Badge>
                )}
              </div>

              {/* Description */}
              {description && (
                <Card className="mb-6">
                  <CardContent className="p-6">
                    <h2 className="mb-3 text-lg font-semibold text-raff-primary">
                      {t("description")}
                    </h2>
                    <p className="whitespace-pre-wrap text-raff-neutral-700">
                      {description}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Buy Now Button - UPDATED */}
              <div className="flex flex-col gap-4">
                <AnimatedButton
                  size="lg"
                  variant="outline"
                  className="w-full text-lg"
                  onClick={handleAddToCart}
                  disabled={!product.inStock}
                >
                  {t("addToCart")}
                  <ShoppingCart className="ms-2 h-5 w-5" />
                </AnimatedButton>
                <AnimatedButton
                  size="lg"
                  className="w-full text-lg"
                  onClick={handleBuyNow}
                  disabled={!product.inStock || isTracking}
                >
                  {isTracking ? (
                    <>
                      <Loader2 className="me-2 h-5 w-5 animate-spin" />
                      {locale === "ar" ? "جاري التحميل..." : "Loading..."}
                    </>
                  ) : (
                    <>
                      {t("buyNow")}
                      <ExternalLink className="ms-2 h-5 w-5" />
                    </>
                  )}
                </AnimatedButton>

                {storeUrl && (
                  <a href={storeUrl} target="_blank" rel="noopener noreferrer">
                    <AnimatedButton variant="outline" size="lg" className="w-full">
                      {t("visitStore")}
                      <ExternalLink className="ms-2 h-5 w-5" />
                    </AnimatedButton>
                  </a>
                )}

                <p className="text-center text-sm text-raff-neutral-500">
                  {t("redirectNotice", { merchant: merchantName })}
                </p>
              </div>
            </div>
          </div>
        </Container>
      </div>
    </PageLayout>
  );
}
