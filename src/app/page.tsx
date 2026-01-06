// src/app/page.tsx
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { HomepageContent } from "./HomepageContent";
import arMessages from "@/../public/messages/ar.json";
import enMessages from "@/../public/messages/en.json";
import { PageTransition } from "@/shared/components/PageTransition";

const LOCALE_COOKIE_NAME = "NEXT_LOCALE";
const MESSAGES = {
  ar: arMessages,
  en: enMessages,
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const storedLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  const locale = storedLocale === "en" ? "en" : "ar";
  const brandName = locale === "ar" ? "رف" : "Raff";
  const messages = MESSAGES[locale].homepage.hero;

  return {
    title: `${brandName} - ${messages.title}`,
    description: messages.subtitle,
  };
}

// Thresholds for showing stats
const STATS_THRESHOLDS = {
  products: 100,
  merchants: 10,
};

export default async function HomePage() {
  const [
    featuredProducts,
    categories,
    featuredMerchants,
    productsCount,
    merchantsCount,
  ] = await Promise.all([
    prisma.product.findMany({
      where: {
        isActive: true,
        inStock: true,
      },
      orderBy: [{ trendingScore: "desc" }, { viewCount: "desc" }],
      take: 8,
      select: {
        id: true,
        title: true,
        titleAr: true,
        slug: true,
        price: true,
        originalPrice: true,
        currency: true,
        thumbnail: true,
        images: true,
        externalProductUrl: true,
        sallaUrl: true,
        trendingScore: true,
        viewCount: true,
        merchant: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            logo: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            slug: true,
          },
        },
      },
    }),
    prisma.category.findMany({
      where: {
        products: {
          some: {
            isActive: true,
          },
        },
      },
      select: {
        id: true,
        name: true,
        nameAr: true,
        slug: true,
        icon: true,
        _count: {
          select: {
            products: {
              where: {
                isActive: true,
              },
            },
          },
        },
      },
      orderBy: {
        products: {
          _count: "desc",
        },
      },
      take: 8,
    }),
    prisma.merchant.findMany({
      where: {
        isActive: true,
        products: {
          some: {
            isActive: true,
          },
        },
      },
      select: {
        id: true,
        name: true,
        nameAr: true,
        logo: true,
        description: true,
        descriptionAr: true,
        _count: {
          select: {
            products: {
              where: {
                isActive: true,
              },
            },
          },
        },
        products: {
          where: {
            isActive: true,
            inStock: true,
          },
          orderBy: {
            trendingScore: "desc",
          },
          take: 3,
          select: {
            id: true,
            title: true,
            titleAr: true,
            slug: true,
            price: true,
            originalPrice: true,
            currency: true,
            thumbnail: true,
            images: true,
            category: {
              select: {
                name: true,
                nameAr: true,
              },
            },
          },
        },
      },
      orderBy: {
        products: {
          _count: "desc",
        },
      },
      take: 2,
    }),
    prisma.product.count({
      where: {
        isActive: true,
      },
    }),
    prisma.merchant.count({
      where: {
        isActive: true,
      },
    }),
  ]);

  // Only show stats if thresholds are met
  const showStats =
    productsCount >= STATS_THRESHOLDS.products &&
    merchantsCount >= STATS_THRESHOLDS.merchants;

  const stats = showStats
    ? {
        products: productsCount,
        merchants: merchantsCount,
      }
    : null;

  // Serialize data for client component (convert Decimal to number)
  const serializedFeaturedProducts = featuredProducts.map((product) => ({
    id: product.id,
    title: product.title,
    titleAr: product.titleAr,
    slug: product.slug,
    price: Number(product.price),
    originalPrice: product.originalPrice ? Number(product.originalPrice) : null,
    currency: product.currency,
    thumbnail: product.thumbnail,
    images: product.images,
    externalUrl: product.externalProductUrl || product.sallaUrl || null,
    trendingScore: product.trendingScore,
    viewCount: product.viewCount,
    merchant: product.merchant,
    category: product.category,
  }));

  const serializedFeaturedMerchants = featuredMerchants.map((merchant) => ({
    id: merchant.id,
    name: merchant.name,
    nameAr: merchant.nameAr,
    logo: merchant.logo,
    description: merchant.description,
    descriptionAr: merchant.descriptionAr,
    _count: merchant._count,
    products: merchant.products.map((product) => ({
      id: product.id,
      title: product.title,
      titleAr: product.titleAr,
      slug: product.slug,
      price: Number(product.price),
      originalPrice: product.originalPrice
        ? Number(product.originalPrice)
        : null,
      currency: product.currency,
      thumbnail: product.thumbnail,
      images: product.images,
      category: product.category,
    })),
  }));

  return (
    <PageTransition>
      <HomepageContent
        featuredProducts={serializedFeaturedProducts}
        categories={categories}
        featuredMerchants={serializedFeaturedMerchants}
        stats={stats}
      />
    </PageTransition>
  );
}
