// src/app/merchants/[id]/page.tsx
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { fetchMerchant } from "@/lib/api/merchants";
import { fetchProducts } from "@/lib/api";
import { MerchantDetailContent } from "./MerchantDetailContent";

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
    const { merchant } = await fetchMerchant(id);

    return {
      title: `${merchant.nameAr || merchant.name} - Raff`,
      description: merchant.descriptionAr || merchant.description || "",
    };
  } catch {
    return {
      title: "Merchant Not Found - Raff",
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
    const data = await fetchMerchant(id);
    merchant = data.merchant;
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
  const { products, pagination } = await fetchProducts({
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
