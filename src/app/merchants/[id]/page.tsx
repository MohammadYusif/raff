// src/app/merchants/[id]/page.tsx
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { fetchProductsServer } from "@/lib/server/products";
import { MerchantDetailContent } from "./MerchantDetailContent";

const LOCALE_COOKIE_NAME = "NEXT_LOCALE";
const NOT_FOUND_TITLES = {
  ar: "التاجر غير موجود - رف",
  en: "Merchant Not Found - Raff",
} as const;
const DEFAULT_TITLES = {
  ar: "التاجر - رف",
  en: "Merchant - Raff",
} as const;

interface MerchantPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    page?: string;
    search?: string;
    sortBy?: string;
    minPrice?: string;
    maxPrice?: string;
  }>;
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: MerchantPageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const cookieStore = await cookies();
    const storedLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
    const locale = storedLocale === "en" ? "en" : "ar";
    const brandName = locale === "ar" ? "رف" : "Raff";

    const merchant = await prisma.merchant.findFirst({
      where: {
        id,
        isActive: true,
        status: "APPROVED",
      },
      select: {
        name: true,
        nameAr: true,
        description: true,
        descriptionAr: true,
      },
    });

    if (!merchant) {
      return {
        title: NOT_FOUND_TITLES[locale],
      };
    }

    const title =
      locale === "ar" ? merchant.nameAr || merchant.name : merchant.name;
    const description =
      locale === "ar"
        ? merchant.descriptionAr || merchant.description
        : merchant.description;

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

export default async function MerchantPage({
  params,
  searchParams,
}: MerchantPageProps) {
  // Await params (Next.js 15 requirement)
  const { id } = await params;
  const searchParamsResolved = await searchParams;

  // Fetch merchant details
  let merchant;
  try {
    merchant = await prisma.merchant.findFirst({
      where: {
        id,
        isActive: true,
        status: "APPROVED",
      },
      select: {
        id: true,
        name: true,
        nameAr: true,
        description: true,
        descriptionAr: true,
        logo: true,
        phone: true,
        email: true,
        sallaStoreUrl: true,
        zidStoreUrl: true,
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
    if (!merchant) {
      notFound();
    }
  } catch {
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

  // Fetch products for this merchant
  const { products, pagination } = await fetchProductsServer({
    page: searchParamsResolved.page ? parseInt(searchParamsResolved.page) : 1,
    limit: 12,
    merchantId: id, // Filter by merchant ID
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
    <MerchantDetailContent
      merchant={merchant}
      initialProducts={products}
      pagination={pagination}
    />
  );
}
