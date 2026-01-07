// src/app/HomepageContent.tsx
"use client";

import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import {
  Container,
  Card,
  CardContent,
  Badge,
} from "@/shared/components/ui";
import { ProductCard } from "@/shared/components/ProductCard";
import { PageLayout } from "@/shared/components/layouts";
import { SearchInput } from "@/shared/components/SearchInput";
import {
  TrendingUp,
  ShieldCheck,
  Zap,
  Package,
  Store,
  Sparkles,
} from "lucide-react";
import { ArrowForward } from "@/core/i18n";
import { AnimatedButton } from "@/shared/components/AnimatedButton";
import { getLocalizedText } from "@/lib/utils";

// Serialized types (Decimal converted to number)
interface SerializedProduct {
  id: string;
  title: string;
  titleAr: string | null;
  slug: string;
  price: number;
  originalPrice: number | null;
  currency: string;
  thumbnail: string | null;
  images: string[];
  externalUrl: string | null;
  trendingScore: number | null;
  viewCount: number;
  merchant: {
    id: string;
    name: string;
    nameAr: string | null;
    logo: string | null;
  };
  category: {
    id: string;
    name: string;
    nameAr: string | null;
    slug: string;
  } | null;
}

interface CategoryWithCount {
  id: string;
  name: string;
  nameAr: string | null;
  slug: string;
  icon: string | null;
  _count: {
    products: number;
  };
}

interface SerializedFeaturedMerchant {
  id: string;
  name: string;
  nameAr: string | null;
  logo: string | null;
  description: string | null;
  descriptionAr: string | null;
  _count: {
    products: number;
  };
  products: Array<{
    id: string;
    title: string;
    titleAr: string | null;
    slug: string;
    price: number;
    originalPrice: number | null;
    currency: string;
    thumbnail: string | null;
    images: string[];
    category: {
      name: string;
      nameAr: string | null;
    } | null;
  }>;
}

interface HomepageContentProps {
  featuredProducts: SerializedProduct[];
  categories: CategoryWithCount[];
  featuredMerchants: SerializedFeaturedMerchant[];
  stats: {
    products: number;
    merchants: number;
  } | null;
}

export function HomepageContent({
  featuredProducts,
  categories,
  featuredMerchants,
  stats,
}: HomepageContentProps) {
  const t = useTranslations("homepage");
  const locale = useLocale();
  const { data: session } = useSession();
  const isMerchant = session?.user?.role === "MERCHANT";
  const merchantCtaHref = isMerchant ? "/merchant/dashboard" : "/merchant/join";
  const merchantCtaLabel = isMerchant
    ? t("cta.goToDashboard")
    : t("cta.merchants");

  return (
    <PageLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden from-raff-primary/5 via-white to-white py-16 sm:py-24">
        <div className="absolute inset-0 -z-10 opacity-5">
          <div className="absolute end-1/4 top-0 h-96 w-96 rounded-full bg-raff-primary blur-3xl" />
          <div className="absolute start-1/4 top-1/3 h-96 w-96 rounded-full bg-raff-accent blur-3xl" />
        </div>

        <Container>
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-raff-primary sm:text-5xl md:text-6xl">
              {t("hero.title")}
            </h1>
            <p className="mb-8 text-lg text-raff-neutral-600 sm:text-xl">
              {t("hero.subtitle")}
            </p>

            {/* Search Bar */}
            <div className="mx-auto mb-12 max-w-2xl">
              <SearchInput
                placeholder={t("hero.searchPlaceholder")}
                size="lg"
              />
            </div>

            {/* Benefits - No Numbers */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div className="flex flex-col items-center gap-2">
                <div className="rounded-full bg-raff-primary/10 p-3">
                  <ShieldCheck className="h-6 w-6 text-raff-primary" />
                </div>
                <p className="text-sm font-medium text-raff-neutral-700">
                  {t("hero.benefits.verified")}
                </p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="rounded-full bg-raff-accent/10 p-3">
                  <TrendingUp className="h-6 w-6 text-raff-accent" />
                </div>
                <p className="text-sm font-medium text-raff-neutral-700">
                  {t("hero.benefits.trending")}
                </p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="rounded-full bg-raff-primary/10 p-3">
                  <Zap className="h-6 w-6 text-raff-primary" />
                </div>
                <p className="text-sm font-medium text-raff-neutral-700">
                  {t("hero.benefits.discover")}
                </p>
              </div>
            </div>

            {/* Conditional Stats */}
            {stats && (
              <div className="mt-16 grid grid-cols-2 gap-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-raff-primary sm:text-4xl">
                    {stats.products.toLocaleString(locale)}+
                  </div>
                  <div className="mt-1 text-sm text-raff-neutral-600">
                    {t("stats.products")}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-raff-primary sm:text-4xl">
                    {stats.merchants.toLocaleString(locale)}+
                  </div>
                  <div className="mt-1 text-sm text-raff-neutral-600">
                    {t("stats.merchants")}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Container>
      </section>

      {/* Featured Products */}
      <section className="border-y border-raff-neutral-200 bg-white py-16 sm:py-24 content-visibility-auto">
        <Container>
          <div className="mb-12 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-raff-accent/10 px-4 py-2 text-sm font-medium text-raff-accent">
              <Sparkles className="h-4 w-4" />
              {t("featured.badge")}
            </div>
            <h2 className="mb-4 text-3xl font-bold text-raff-primary sm:text-4xl">
              {t("featured.title")}
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-raff-neutral-600">
              {t("featured.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.map((product, index) => (
              <ProductCard
                key={product.id}
                product={{
                  id: product.id,
                  slug: product.slug,
                  title: product.title,
                  titleAr: product.titleAr,
                  price: product.price,
                  originalPrice: product.originalPrice,
                  currency: product.currency,
                  thumbnail: product.thumbnail,
                  images: product.images,
                  externalUrl: product.externalUrl,
                  trendingScore: product.trendingScore ?? 0,
                  merchant: {
                    name: product.merchant.name,
                    nameAr: product.merchant.nameAr,
                  },
                  category: product.category
                    ? {
                        name: product.category.name,
                        nameAr: product.category.nameAr,
                      }
                    : null,
                }}
                index={index}
                showCategory={true}
              />
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link href="/products">
              <AnimatedButton size="lg" className="gap-2">
                {t("featured.viewAll")}
                <ArrowForward className="h-5 w-5" />
              </AnimatedButton>
            </Link>
          </div>
        </Container>
      </section>

      {/* Categories Grid */}
      <section className="bg-raff-neutral-50 py-16 sm:py-24 content-visibility-auto">
        <Container>
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-raff-primary sm:text-4xl">
              {t("categories.title")}
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-raff-neutral-600">
              {t("categories.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-6">
            {categories.map((category) => {
              const categoryName = getLocalizedText(
                locale,
                category.nameAr,
                category.name
              );

              return (
                <Link key={category.id} href={`/categories/${category.slug}`}>
                  <Card className="group transition-all duration-300 hover:shadow-lg">
                    <CardContent className="p-6 text-center">
                      <div className="mb-4 flex h-16 items-center justify-center text-4xl">
                        {category.icon || "📦"}
                      </div>
                      <h3 className="font-semibold text-raff-primary transition-colors group-hover:text-raff-accent">
                        {categoryName}
                      </h3>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          <div className="mt-12 text-center">
            <Link href="/categories">
              <AnimatedButton variant="outline" size="lg" className="gap-2">
                {t("categories.viewAll")}
                <ArrowForward className="h-5 w-5" />
              </AnimatedButton>
            </Link>
          </div>
        </Container>
      </section>

      {/* How It Works */}
      <section className="border-y border-raff-neutral-200 bg-white py-16 sm:py-24 content-visibility-auto">
        <Container>
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-raff-primary sm:text-4xl">
              {t("howItWorks.title")}
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-raff-neutral-600">
              {t("howItWorks.subtitle")}
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {["step1", "step2", "step3"].map((step, index) => (
              <div key={step} className="text-center">
                <div className="mb-4 flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-raff-primary text-2xl font-bold text-white">
                    {index + 1}
                  </div>
                </div>
                <h3 className="mb-2 text-xl font-bold text-raff-primary">
                  {t(`howItWorks.${step}.title`)}
                </h3>
                <p className="text-raff-neutral-600">
                  {t(`howItWorks.${step}.description`)}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Featured Merchants */}
      {featuredMerchants.length > 0 && (
        <section className=" from-white to-raff-neutral-50 py-16 sm:py-24 content-visibility-auto">
          <Container>
            <div className="mb-12 text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-raff-primary/10 px-4 py-2 text-sm font-medium text-raff-primary">
                <Store className="h-4 w-4" />
                {t("merchants.badge")}
              </div>
              <h2 className="mb-4 text-3xl font-bold text-raff-primary sm:text-4xl">
                {t("merchants.title")}
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-raff-neutral-600">
                {t("merchants.subtitle")}
              </p>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              {featuredMerchants.map((merchant) => {
                const merchantName = getLocalizedText(
                  locale,
                  merchant.nameAr,
                  merchant.name
                );
                const merchantDescription = getLocalizedText(
                  locale,
                  merchant.descriptionAr,
                  merchant.description
                );

                return (
                  <Card
                    key={merchant.id}
                    className="group overflow-hidden transition-all duration-300 hover:shadow-xl"
                  >
                    <CardContent className="p-8">
                      {/* Merchant Header */}
                      <div className="mb-6 flex items-start gap-4">
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl  from-raff-primary/10 to-raff-accent/10 transition-transform group-hover:scale-105">
                          {merchant.logo ? (
                            <Image
                              src={merchant.logo}
                              alt={merchantName}
                              width={64}
                              height={64}
                              className="h-16 w-16 rounded-xl object-cover"
                            />
                          ) : (
                            <Store className="h-10 w-10 text-raff-primary" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="mb-1 text-2xl font-bold text-raff-primary">
                            {merchantName}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-raff-neutral-600">
                            <Package className="h-4 w-4" />
                            <span>
                              {merchant._count.products}{" "}
                              {t("merchants.productsLabel")}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      {merchantDescription && (
                        <p className="mb-6 line-clamp-2 text-raff-neutral-600">
                          {merchantDescription}
                        </p>
                      )}

                      {/* Product Preview Grid */}
                      <div className="mb-6">
                        <p className="mb-3 text-sm font-medium text-raff-neutral-700">
                          {t("merchants.topProducts")}
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                          {merchant.products.map((product) => {
                            const productTitle = getLocalizedText(
                              locale,
                              product.titleAr,
                              product.title
                            );
                            const previewImage =
                              product.thumbnail || product.images?.[0] || null;
                            const originalPrice = product.originalPrice;
                            const hasDiscount =
                              originalPrice !== null &&
                              originalPrice > product.price;
                            const discountPercentage = hasDiscount
                              ? Math.round(
                                  ((originalPrice - product.price) /
                                    originalPrice) *
                                    100
                                )
                              : 0;

                            return (
                              <Link
                                key={product.id}
                                href={`/products/${encodeURIComponent(product.slug)}`}
                                className="group/product"
                              >
                                <div className="overflow-hidden rounded-xl bg-raff-neutral-100 transition-all duration-300 hover:shadow-md">
                                  <div className="relative aspect-square">
                                    {previewImage ? (
                                      <Image
                                        src={previewImage}
                                        alt={productTitle}
                                        fill
                                        sizes="(max-width: 1024px) 33vw, 120px"
                                        className="object-cover transition-transform duration-300 group-hover/product:scale-105"
                                      />
                                    ) : (
                                      <div className="flex h-full items-center justify-center">
                                        <Package className="h-7 w-7 text-raff-neutral-400" />
                                      </div>
                                    )}
                                    {hasDiscount && (
                                      <div className="absolute start-2 top-2">
                                        <Badge variant="error" className="text-xs">
                                          -{discountPercentage}%
                                        </Badge>
                                      </div>
                                    )}
                                  </div>
                                  <div className="p-2 text-center">
                                    <p className="line-clamp-2 text-xs font-medium text-raff-neutral-700">
                                      {productTitle}
                                    </p>
                                  </div>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>

                      {/* Visit Store Button */}
                      <Link href={`/merchants/${merchant.id}`}>
                        <AnimatedButton className="w-full gap-2 transition-all hover:gap-3">
                          {t("merchants.visitStore")}
                          <ArrowForward className="h-4 w-4" />
                        </AnimatedButton>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* View All Merchants */}
            <div className="mt-12 text-center">
              <Link href="/merchants">
                <AnimatedButton variant="outline" size="lg" className="gap-2">
                  {t("merchants.viewAll")}
                  <ArrowForward className="h-5 w-5" />
                </AnimatedButton>
              </Link>
            </div>
          </Container>
        </section>
      )}

      {/* Call to Action - Dual Card Design */}
      <section className="relative overflow-hidden from-raff-neutral-50 to-white py-16 sm:py-24 content-visibility-auto">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute start-1/4 top-0 h-96 w-96 rounded-full bg-raff-primary/5 blur-3xl" />
          <div className="absolute end-1/4 bottom-0 h-96 w-96 rounded-full bg-raff-accent/5 blur-3xl" />
        </div>

        <Container>
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-raff-primary sm:text-4xl">
              {t("cta.title")}
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-raff-neutral-600">
              {t("cta.subtitle")}
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Shoppers Card */}
            <Card className="group relative overflow-hidden border-2 border-raff-primary/20 transition-all duration-300 hover:border-raff-primary hover:shadow-2xl">
              <div className="absolute end-0 top-0 h-32 w-32  from-raff-primary/10 to-transparent" />
              <CardContent className="relative p-8 sm:p-10">
                <div className="mb-6 inline-flex rounded-2xl bg-raff-primary/10 p-4 transition-transform group-hover:scale-110">
                  <Sparkles className="h-8 w-8 text-raff-primary" />
                </div>
                <h3 className="mb-3 text-2xl font-bold text-raff-primary">
                  {t("cta.shoppersTitle")}
                </h3>
                <p className="mb-6 text-raff-neutral-600">
                  {t("cta.shoppersDescription")}
                </p>
                <ul className="mb-8 space-y-3">
                  <li className="flex items-center gap-3 text-sm text-raff-neutral-700">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-raff-primary/10">
                      <TrendingUp className="h-4 w-4 text-raff-primary" />
                    </div>
                    {t("cta.shoppersBenefit1")}
                  </li>
                  <li className="flex items-center gap-3 text-sm text-raff-neutral-700">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-raff-primary/10">
                      <ShieldCheck className="h-4 w-4 text-raff-primary" />
                    </div>
                    {t("cta.shoppersBenefit2")}
                  </li>
                  <li className="flex items-center gap-3 text-sm text-raff-neutral-700">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-raff-primary/10">
                      <Zap className="h-4 w-4 text-raff-primary" />
                    </div>
                    {t("cta.shoppersBenefit3")}
                  </li>
                </ul>
                <Link href="/products">
                  <AnimatedButton
                    size="lg"
                    className="w-full gap-2 transition-all hover:gap-3"
                  >
                    {t("cta.shoppers")}
                    <ArrowForward className="h-5 w-5" />
                  </AnimatedButton>
                </Link>
              </CardContent>
            </Card>

            {/* Merchants Card */}
            <Card className="group relative overflow-hidden border-2 border-raff-accent/20 transition-all duration-300 hover:border-raff-accent hover:shadow-2xl">
              <div className="absolute end-0 top-0 h-32 w-32  from-raff-accent/10 to-transparent" />
              <CardContent className="relative p-8 sm:p-10">
                <div className="mb-6 inline-flex rounded-2xl bg-raff-accent/10 p-4 transition-transform group-hover:scale-110">
                  <Store className="h-8 w-8 text-raff-accent" />
                </div>
                <h3 className="mb-3 text-2xl font-bold text-raff-primary">
                  {t("cta.merchantsTitle")}
                </h3>
                <p className="mb-6 text-raff-neutral-600">
                  {t("cta.merchantsDescription")}
                </p>
                <ul className="mb-8 space-y-3">
                  <li className="flex items-center gap-3 text-sm text-raff-neutral-700">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-raff-accent/10">
                      <TrendingUp className="h-4 w-4 text-raff-accent" />
                    </div>
                    {t("cta.merchantsBenefit1")}
                  </li>
                  <li className="flex items-center gap-3 text-sm text-raff-neutral-700">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-raff-accent/10">
                      <Zap className="h-4 w-4 text-raff-accent" />
                    </div>
                    {t("cta.merchantsBenefit2")}
                  </li>
                  <li className="flex items-center gap-3 text-sm text-raff-neutral-700">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-raff-accent/10">
                      <Package className="h-4 w-4 text-raff-accent" />
                    </div>
                    {t("cta.merchantsBenefit3")}
                  </li>
                </ul>
                <Link href={merchantCtaHref}>
                  <AnimatedButton
                    size="lg"
                    className="w-full gap-2 bg-raff-accent hover:bg-raff-accent/90 transition-all hover:gap-3"
                  >
                    {merchantCtaLabel}
                    <ArrowForward className="h-5 w-5" />
                  </AnimatedButton>
                </Link>
              </CardContent>
            </Card>
          </div>
        </Container>
      </section>
    </PageLayout>
  );
}
