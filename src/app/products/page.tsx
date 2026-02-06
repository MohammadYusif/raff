// src/app/products/page.tsx
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { fetchProductsServer } from "@/lib/server/products";
import { ProductsContent } from "./ProductsContent";
import { addCartFields, serializeProduct } from "@/lib/products/cart";
import { PageTransition } from "@/shared/components/PageTransition";

interface ProductsPageProps {
  searchParams: Promise<{
    page?: string;
    category?: string;
    search?: string;
    sortBy?: string;
    minPrice?: string;
    maxPrice?: string;
  }>;
}

const LOCALE_COOKIE_NAME = "NEXT_LOCALE";
const TITLES = {
  ar: "المنتجات - رف",
  en: "Products - Raff",
} as const;
const DESCRIPTIONS = {
  ar: "تصفح المنتجات من المتاجر السعودية",
  en: "Browse products from Saudi stores",
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

export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  // Await searchParams (Next.js 15 requirement)
  const params = await searchParams;

  // Validate sortBy
  const validSortOptions = [
    "trending",
    "newest",
    "price_low",
    "price_high",
  ] as const;
  type SortOption = (typeof validSortOptions)[number];
  const isSortOption = (value?: string): value is SortOption =>
    !!value && validSortOptions.includes(value as SortOption);
  const sortBy = isSortOption(params.sortBy) ? params.sortBy : undefined;

  // Fetch products with filters
  const { products, pagination } = await fetchProductsServer({
    page: params.page ? parseInt(params.page) : 1,
    limit: 12,
    category: params.category,
    search: params.search,
    sortBy,
    minPrice: params.minPrice ? parseFloat(params.minPrice) : undefined,
    maxPrice: params.maxPrice ? parseFloat(params.maxPrice) : undefined,
  });

  // Fetch categories for filter sidebar
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

  const productsWithCartFields = products.map((p) => serializeProduct(addCartFields(p)));

  return (
    <PageTransition>
      <ProductsContent
        initialProducts={productsWithCartFields}
        pagination={pagination}
        categories={categories}
      />
    </PageTransition>
  );
}