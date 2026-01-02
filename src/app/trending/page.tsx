// src/app/trending/page.tsx
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { TrendingContent } from "./TrendingContent";

const LOCALE_COOKIE_NAME = "NEXT_LOCALE";
const TITLES = {
  ar: "المنتجات الرائجة - رف",
  en: "Trending Products - Raff",
} as const;
const DESCRIPTIONS = {
  ar: "اكتشف أكثر المنتجات رواجًا",
  en: "Discover the most popular trending products",
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const storedLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  const locale = storedLocale === "en" ? "en" : "ar";

  return {
    title: TITLES[locale],
    description: DESCRIPTIONS[locale],
  };
}

export default async function TrendingPage() {
  // Fetch trending products (no filters needed, sorted by trendingScore)
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      inStock: true,
      trendingScore: {
        gt: 0,
      },
    },
    orderBy: {
      trendingScore: "desc",
    },
    take: 20,
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
          nameAr: true,
          logo: true,
          sallaStoreUrl: true,
          zidStoreUrl: true,
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
  });

  return <TrendingContent products={products} />;
}
