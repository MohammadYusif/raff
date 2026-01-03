// src/app/categories/page.tsx
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { CategoriesContent } from "./CategoriesContent";
import { PageTransition } from "@/shared/components/PageTransition";

const LOCALE_COOKIE_NAME = "NEXT_LOCALE";
const TITLES = {
  ar: "التصنيفات - رف",
  en: "Categories - Raff",
} as const;
const DESCRIPTIONS = {
  ar: "تصفح المنتجات حسب التصنيف",
  en: "Browse products by category",
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

export default async function CategoriesPage() {
  // Fetch all categories with product counts
  const categories = await prisma.category.findMany({
    where: {
      isActive: true,
      parentId: null,
    },
    orderBy: {
      order: "asc",
    },
    include: {
      _count: {
        select: {
          products: {
            where: {
              isActive: true,
              inStock: true,
            },
          },
        },
      },
      children: {
        where: {
          isActive: true,
        },
        orderBy: {
          order: "asc",
        },
      },
    },
  });

  return (
    <PageTransition>
      <CategoriesContent categories={categories} />
    </PageTransition>
  );
}