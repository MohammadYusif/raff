// src/app/products/[slug]/ProductDetailContent.tsx
"use client";

import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { PageLayout } from "@/shared/components/layouts";
import {
  Container,
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
  Separator,
} from "@/shared/components/ui";
import { ArrowBackward } from "@/core/i18n";
import { formatPrice } from "@/lib/utils";
import { getMerchantStoreUrl } from "@/lib/platform/store";
import {
  ShoppingBag,
  Store,
  Tag,
  TrendingUp,
  ExternalLink,
} from "lucide-react";
import type { ProductWithRelations } from "@/types";

interface ProductDetailContentProps {
  product: ProductWithRelations;
}

export function ProductDetailContent({ product }: ProductDetailContentProps) {
  const t = useTranslations("product");
  const commonT = useTranslations("common");
  const locale = useLocale();

  const productTitle =
    locale === "ar" ? product.titleAr || product.title : product.title;
  const productDescription =
    locale === "ar"
      ? product.descriptionAr || product.description
      : product.description;
  const merchantName =
    locale === "ar"
      ? product.merchant.nameAr || product.merchant.name
      : product.merchant.name;
  const merchantDescription =
    locale === "ar"
      ? product.merchant.descriptionAr || product.merchant.description
      : product.merchant.description;
  const categoryName =
    locale === "ar"
      ? product.category?.nameAr || product.category?.name
      : product.category?.name;
  const storeUrl = getMerchantStoreUrl(product.merchant);
  const externalProductUrl = product.externalProductUrl || storeUrl;

  // Calculate discount percentage
  const discountPercentage =
    product.originalPrice && product.originalPrice > product.price
      ? Math.max(
          0,
          Math.round(
            ((product.originalPrice - product.price) / product.originalPrice) *
              100
          )
        )
      : 0;

  return (
    <PageLayout>
      <div className="min-h-screen bg-raff-neutral-50">
        {/* Breadcrumb Navigation */}
        <div className="border-b border-raff-neutral-200 bg-white">
          <Container className="py-4">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink>
                    <Link href="/">{commonT("nav.home")}</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink>
                    <Link href="/products">{commonT("nav.products")}</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {product.category && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbLink>
                        <Link href={`/categories/${product.category.slug}`}>
                          {categoryName}
                        </Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                  </>
                )}
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="line-clamp-1">
                    {productTitle}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </Container>
        </div>

        <Container className="py-8 sm:py-12">
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Product Images */}
            <div className="space-y-4">
              {/* Main Image Card */}
              <Card className="overflow-hidden hover-lift">
                <div className="aspect-square">
                  <div className="flex h-full items-center justify-center from-raff-neutral-50 to-raff-neutral-100">
                    <div className="text-center">
                      <div className="mb-4 text-9xl opacity-40">📦</div>
                      {product.trendingScore > 70 && (
                        <Badge
                          variant="default"
                          className="gap-2 bg-raff-primary"
                        >
                          <TrendingUp className="h-4 w-4" />
                          {commonT("labels.trending")}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Stock Status */}
              <div className="flex items-center gap-2">
                {product.inStock ? (
                  <Badge variant="success" className="gap-1">
                    <div className="h-2 w-2 rounded-full bg-white" />
                    {t("inStock")}
                  </Badge>
                ) : (
                  <Badge variant="error">{t("outOfStock")}</Badge>
                )}
                {product.quantity &&
                  product.quantity < 10 &&
                  product.inStock && (
                    <span className="text-sm text-raff-warning">
                      {t("limitedStock", { count: product.quantity })}
                    </span>
                  )}
              </div>
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              {/* Category & Title Card */}
              <Card className="hover-lift">
                <CardHeader>
                  {product.category && (
                    <Link href={`/categories/${product.category.slug}`}>
                      <Badge
                        variant="outline"
                        className="mb-3 w-fit gap-1 hover:bg-raff-neutral-100"
                      >
                        <Tag className="h-3 w-3" />
                        {categoryName}
                      </Badge>
                    </Link>
                  )}
                  <CardTitle className="text-3xl sm:text-4xl">
                    {productTitle}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-3 text-base">
                    <span className="flex items-center gap-1">
                      <Store className="h-4 w-4" />
                      {merchantName}
                    </span>
                    <span>•</span>
                    <span>
                      {product.viewCount.toLocaleString(
                        locale === "ar" ? "ar-SA" : "en-US"
                      )}{" "}
                      {locale === "ar" ? "مشاهدة" : "views"}
                    </span>
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Price Card */}
              <Card className="hover-lift">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    {product.originalPrice && (
                      <div className="flex items-center gap-3">
                        <span className="text-lg text-raff-neutral-500 line-through">
                          {formatPrice(product.originalPrice, locale)}
                        </span>
                        <Badge variant="error" className="gap-1">
                          -{discountPercentage}%
                        </Badge>
                      </div>
                    )}
                    <div className="text-4xl font-bold text-raff-primary">
                      {formatPrice(product.price, locale)}
                    </div>
                    <p className="text-sm text-raff-neutral-600">
                      {t("taxIncluded")}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Description Card */}
              {productDescription && (
                <Card className="hover-lift">
                  <CardHeader>
                    <CardTitle className="text-xl">
                      {t("description")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="leading-relaxed text-raff-neutral-700">
                      {productDescription}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Merchant Info Card */}
              <Card className="hover-lift">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Store className="mt-1 h-5 w-5 shrink-0 text-raff-primary" />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-raff-primary">
                        {merchantName}
                      </h3>
                      {merchantDescription && (
                        <p className="mt-1 text-sm text-raff-neutral-600 line-clamp-2">
                          {merchantDescription}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Separator />

              {/* Action Buttons */}
              <div className="space-y-3">
                {/* Buy Now Button */}
                {externalProductUrl ? (
                  <a
                    href={externalProductUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      size="lg"
                      className="w-full gap-2 text-lg"
                      disabled={!product.inStock}
                    >
                      <ShoppingBag className="h-5 w-5" />
                      {product.inStock ? t("buyNow") : t("outOfStock")}
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                ) : (
                  <Button size="lg" className="w-full gap-2 text-lg" disabled>
                    <ShoppingBag className="h-5 w-5" />
                    {t("buyNow")}
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}

                <Separator />

                {/* Visit Store Button */}
                {storeUrl ? (
                  <a href={storeUrl} target="_blank" rel="noopener noreferrer">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full gap-2 text-lg"
                    >
                      <Store className="h-5 w-5" />
                      {t("visitStore")}
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                ) : (
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full gap-2 text-lg"
                    disabled
                  >
                    <Store className="h-5 w-5" />
                    {t("visitStore")}
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}

                {/* Back to Products */}
                <Link href="/products">
                  <Button
                    size="lg"
                    variant="ghost"
                    className="w-full gap-2 text-lg"
                  >
                    <ArrowBackward className="h-5 w-5" />
                    {t("backToProducts")}
                  </Button>
                </Link>
              </div>

              {/* Info Notice Card */}
              <Card className="border-raff-accent/20 bg-raff-accent/5 hover-lift">
                <CardContent className="p-4 text-sm text-raff-neutral-700">
                  💡 {t("redirectNotice", { merchant: merchantName })}
                </CardContent>
              </Card>
            </div>
          </div>
        </Container>
      </div>
    </PageLayout>
  );
}
