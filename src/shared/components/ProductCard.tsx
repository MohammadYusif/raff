// src/shared/components/ProductCard.tsx
"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { TrendingUp, ArrowRight, ShoppingCart } from "lucide-react";
import { Card, CardContent, Badge } from "@/shared/components/ui";
import { easeOut } from "framer-motion";
import { AnimatedButton } from "@/shared/components/AnimatedButton";
import { useCart } from "@/lib/hooks/useCart";
import { toast } from "sonner";

interface ProductCardProps {
  product: {
    id: string;
    slug: string;
    title: string;
    titleAr?: string | null;
    price: number;
    originalPrice?: number | null;
    trendingScore: number;
    merchant: {
      name: string;
      nameAr?: string | null;
    };
    category?: {
      name: string;
      nameAr?: string | null;
    } | null;
    imageUrl?: string | null;
    currency?: string;
    externalUrl?: string | null;
  };
  index?: number;
  showCategory?: boolean;
}

/**
 * Animated Product Card Component
 *
 * Features:
 * - Framer Motion animations
 * - Staggered entrance
 * - Image hover zoom
 * - Badge slide-in animation
 * - Smooth transitions
 * - RTL support
 * - Add to cart functionality
 */
export function ProductCard({
  product,
  index = 0,
  showCategory = true,
}: ProductCardProps) {
  const locale = useLocale();
  const commonT = useTranslations("common");
  const { addItem } = useCart();

  const productTitle =
    locale === "ar" ? product.titleAr || product.title : product.title;

  const merchantName =
    locale === "ar"
      ? product.merchant.nameAr || product.merchant.name
      : product.merchant.name;

  const categoryName = product.category
    ? locale === "ar"
      ? product.category.nameAr || product.category.name
      : product.category.name
    : null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
      style: "currency",
      currency: "SAR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const hasDiscount =
    product.originalPrice && product.originalPrice > product.price;
  const discountPercentage = hasDiscount
    ? Math.round(
        ((product.originalPrice! - product.price) / product.originalPrice!) *
          100
      )
    : 0;

  // Handle add to cart
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation if clicked inside a link

    addItem({
      id: product.id,
      slug: product.slug,
      name: product.title,
      nameAr: product.titleAr,
      image: product.imageUrl || null,
      price: product.price,
      currency: product.currency || "SAR",
      merchantName: product.merchant.name,
      merchantNameAr: product.merchant.nameAr,
      categoryName: product.category?.name || null,
      categoryNameAr: product.category?.nameAr || null,
      externalUrl: product.externalUrl || `/products/${product.slug}`,
    });

    toast.success(locale === "ar" ? "تمت الإضافة إلى السلة" : "Added to cart", {
      description:
        locale === "ar"
          ? `تمت إضافة ${productTitle} إلى سلة التسوق`
          : `${productTitle} has been added to your cart`,
    });
  };

  // Animation variants
  const cardVariants = {
    hidden: {
      opacity: 0,
      y: 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        delay: index * 0.05, // Stagger effect
        ease: easeOut,
      },
    },
  };

  const imageVariants = {
    rest: { scale: 1 },
    hover: {
      scale: 1.1,
      transition: {
        duration: 0.4,
        ease: easeOut,
      },
    },
  };

  const badgeVariants = {
    hidden: {
      opacity: 0,
      x: locale === "ar" ? 20 : -20,
    },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.3,
        delay: index * 0.05 + 0.2,
        ease: easeOut,
      },
    },
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="h-full"
    >
      <Card className="group h-full overflow-hidden transition-all hover:shadow-lg">
        <CardContent className="flex h-full flex-col p-0">
          {/* Product Image */}
          <Link href={`/products/${product.slug}`}>
            <motion.div
              className="relative aspect-square overflow-hidden bg-raff-neutral-100"
              initial="rest"
              whileHover="hover"
            >
              <motion.div variants={imageVariants} className="h-full w-full">
                {/* Placeholder for image - you can add Image component here */}
                <div className="flex h-full w-full items-center justify-center from-raff-primary/10 to-raff-accent/10">
                  <span className="text-4xl opacity-50">📦</span>
                </div>
              </motion.div>

              {/* Trending Badge */}
              {product.trendingScore > 0 && (
                <motion.div
                  className={`absolute top-3 ${
                    locale === "ar" ? "left-3" : "right-3"
                  }`}
                  variants={badgeVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <Badge className="gap-1 bg-raff-accent text-white shadow-lg">
                    <TrendingUp className="h-3 w-3" />
                    {commonT("labels.trending")}
                  </Badge>
                </motion.div>
              )}

              {/* Discount Badge */}
              {hasDiscount && (
                <motion.div
                  className={`absolute top-3 ${
                    locale === "ar" ? "right-3" : "left-3"
                  }`}
                  variants={badgeVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <Badge variant="error" className="shadow-lg">
                    -{discountPercentage}%
                  </Badge>
                </motion.div>
              )}
            </motion.div>
          </Link>

          {/* Product Info */}
          <div className="flex flex-1 flex-col gap-3 p-4">
            {/* Category */}
            {showCategory && categoryName && (
              <Badge variant="secondary" className="w-fit text-xs font-medium">
                {categoryName}
              </Badge>
            )}

            {/* Title */}
            <Link href={`/products/${product.slug}`}>
              <h3
                className="line-clamp-2 text-base font-semibold text-raff-primary transition-colors group-hover:text-raff-accent"
                dir={locale === "ar" ? "rtl" : "ltr"}
              >
                {productTitle}
              </h3>
            </Link>

            {/* Merchant */}
            <p className="text-sm text-raff-neutral-600">{merchantName}</p>

            {/* Price */}
            <div className="mt-auto">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-raff-primary">
                  {formatPrice(product.price)}
                </span>
                {hasDiscount && (
                  <span className="text-sm text-raff-neutral-500 line-through">
                    {formatPrice(product.originalPrice!)}
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <motion.div
              className="flex gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.05 + 0.3 }}
            >
              {/* Add to Cart Button */}
              <AnimatedButton
                variant="default"
                size="sm"
                className="flex-1 gap-2"
                onClick={handleAddToCart}
              >
                <ShoppingCart className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {commonT("actions.addToCart")}
                </span>
              </AnimatedButton>

              {/* View Details Button */}
              <Link href={`/products/${product.slug}`} className="flex-1">
                <AnimatedButton
                  variant="outline"
                  size="sm"
                  className="group/btn w-full gap-2 transition-all hover:bg-raff-primary hover:text-white"
                >
                  <span className="hidden sm:inline">
                    {commonT("actions.viewDetails")}
                  </span>
                  <ArrowRight
                    className={`h-4 w-4 transition-transform sm:inline ${
                      locale === "ar"
                        ? "rotate-180 group-hover/btn:-translate-x-1"
                        : "group-hover/btn:translate-x-1"
                    }`}
                  />
                </AnimatedButton>
              </Link>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
