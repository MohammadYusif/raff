// src/app/categories/[slug]/page.tsx
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { fetchProductsServer } from "@/lib/server/products";
import { CategoryDetailContent } from "./CategoryDetailContent";
import { PageTransition } from "@/shared/components/PageTransition";
import { getLocalizedText } from "@/lib/utils";
import { serializeProduct } from "@/lib/products/cart";

const LOCALE_COOKIE_NAME = "NEXT_LOCALE";
const NOT_FOUND_TITLES = {
  ar: "التصنيف غير موجود - رف",
  en: "Category Not Found - Raff",
} as const;
const DEFAULT_TITLES = {
  ar: "التصنيف - رف",
  en: "Category - Raff",
} as const;

interface CategoryPageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    page?: string;
    search?: string;
    sortBy?: string;
    minPrice?: string;
    maxPrice?: string;
  }>;
}

// Helper functions for slug normalization
function normalizeSlug(raw: string): string {
  const cleaned = raw.trim().replaceAll("+", "%20");
  const once = safeDecode(cleaned);
  const twice = safeDecode(once);
  return twice.trim().normalize("NFC");
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = normalizeSlug(rawSlug);

  try {
    const cookieStore = await cookies();
    const storedLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
    const locale = storedLocale === "en" ? "en" : "ar";
    const brandName = locale === "ar" ? "رف" : "Raff";

    const category = await prisma.category.findUnique({
      where: { slug },
      select: {
        name: true,
        nameAr: true,
        description: true,
        descriptionAr: true,
      },
    });

    if (!category) {
      return {
        title: NOT_FOUND_TITLES[locale],
      };
    }

    const title = getLocalizedText(locale, category.nameAr, category.name);
    const description = getLocalizedText(
      locale,
      category.descriptionAr,
      category.description
    );

    return {
      title: `${title} - ${brandName}`,
      description: description || "",
    };
  } catch {
    const cookieStore = await cookies();
    const storedLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
    const locale = storedLocale === "en" ? "en" : "ar";

    return {
      title: DEFAULT_TITLES[locale],
    };
  }
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  // Await params (Next.js 15 requirement)
  const { slug: rawSlug } = await params;
  const slug = normalizeSlug(rawSlug);
  const searchParamsResolved = await searchParams;

  const category = await prisma.category.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      nameAr: true,
      slug: true,
      description: true,
      descriptionAr: true,
      icon: true,
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
    },
  });

  if (!category) {
    notFound();
  }

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
  const sortBy = isSortOption(searchParamsResolved.sortBy)
    ? searchParamsResolved.sortBy
    : undefined;

  // Fetch products for this category
  const { products, pagination } = await fetchProductsServer({
    page: searchParamsResolved.page ? parseInt(searchParamsResolved.page) : 1,
    limit: 12,
    category: category.slug, // Use the actual category slug, not the URL slug
    search: searchParamsResolved.search,
    sortBy,
    minPrice: searchParamsResolved.minPrice
      ? parseFloat(searchParamsResolved.minPrice)
      : undefined,
    maxPrice: searchParamsResolved.maxPrice
      ? parseFloat(searchParamsResolved.maxPrice)
      : undefined,
  });

  return (
    <PageTransition>
      <CategoryDetailContent
        category={category}
        initialProducts={products.map(serializeProduct)}
        pagination={pagination}
      />
    </PageTransition>
  );
}
