// src/shared/components/ProductCard.tsx
"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useLocale } from "next-intl";
import { TrendingUp, ArrowRight } from "lucide-react";
import { Card, CardContent, Badge } from "@/shared/components/ui";
import { easeOut } from "framer-motion";
import { AnimatedButton } from "@/shared/components/AnimatedButton";

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
  };
  index?: number;
  showCategory?: boolean;
  commonT: (key: string) => string;
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
 */
export function ProductCard({
  product,
  index = 0,
  showCategory = true,
  commonT,
}: ProductCardProps) {
  const locale = useLocale();

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
      x: locale === "ar" ? -10 : 10,
      y: -10,
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        delay: index * 0.05 + 0.2,
        duration: 0.3,
        ease: easeOut,
      },
    },
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
    >
      <Card className="group h-full overflow-hidden border-raff-neutral-200 transition-shadow duration-300 hover:shadow-lg">
        <CardContent className="flex h-full flex-col p-0">
          {/* Product Image */}
          <Link href={`/products/${product.slug}`}>
            <div className="relative aspect-square overflow-hidden from-raff-neutral-50 to-raff-neutral-100">
              <motion.div
                className="flex h-full items-center justify-center"
                variants={imageVariants}
              >
                <div className="text-center">
                  <div className="mb-3 text-6xl opacity-40">📦</div>
                </div>
              </motion.div>

              {/* Trending Badge */}
              {product.trendingScore > 70 && (
                <motion.div
                  className="absolute start-3 top-3"
                  variants={badgeVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <Badge className="gap-1 bg-raff-primary shadow-md">
                    <TrendingUp className="h-3 w-3" />
                    {commonT("labels.trending")}
                  </Badge>
                </motion.div>
              )}

              {/* Discount Badge */}
              {hasDiscount && (
                <motion.div
                  className="absolute end-3 top-3"
                  variants={badgeVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <Badge className="bg-raff-error shadow-md">
                    -{discountPercentage}%
                  </Badge>
                </motion.div>
              )}
            </div>
          </Link>

          {/* Product Info */}
          <div className="flex flex-1 flex-col p-4">
            <div className="flex-1">
              {/* Category Badge */}
              {showCategory && categoryName && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 + 0.1 }}
                >
                  <Badge variant="secondary" className="mb-2 text-xs">
                    {categoryName}
                  </Badge>
                </motion.div>
              )}

              {/* Merchant Name */}
              <motion.p
                className="mb-1 text-xs text-raff-neutral-500"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 + 0.15 }}
              >
                {merchantName}
              </motion.p>

              {/* Product Title */}
              <Link href={`/products/${product.slug}`}>
                <motion.h3
                  className="mb-2 line-clamp-2 text-base font-semibold text-raff-primary transition-colors hover:text-raff-accent"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 + 0.2 }}
                >
                  {productTitle}
                </motion.h3>
              </Link>

              {/* Price */}
              <motion.div
                className="mb-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 + 0.25 }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-raff-primary">
                    {formatPrice(product.price)}
                  </span>
                  {hasDiscount && (
                    <span className="text-sm text-raff-neutral-500 line-through">
                      {formatPrice(product.originalPrice!)}
                    </span>
                  )}
                </div>
              </motion.div>
            </div>

            {/* View Details Button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.05 + 0.3 }}
            >
              <Link href={`/products/${product.slug}`}>
                <AnimatedButton
                  variant="outline"
                  size="sm"
                  className="group/btn w-full gap-2 transition-all hover:bg-raff-primary hover:text-white"
                >
                  {commonT("actions.viewDetails")}
                  <ArrowRight
                    className={`h-4 w-4 transition-transform ${
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