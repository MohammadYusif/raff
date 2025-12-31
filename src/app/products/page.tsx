// src/app/products/page.tsx
import { fetchProducts, fetchCategories } from "@/lib/api";
import { ProductsContent } from "./ProductsContent";

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

// Dynamic metadata will be handled by next-intl or removed for now
// Since metadata can't use useTranslations, we'll keep it simple
export const metadata = {
  title: "Products - Raff",
  description: "Browse products from Saudi stores",
};

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
  const { products, pagination } = await fetchProducts({
    page: params.page ? parseInt(params.page) : 1,
    limit: 12,
    category: params.category,
    search: params.search,
    sortBy,
    minPrice: params.minPrice ? parseFloat(params.minPrice) : undefined,
    maxPrice: params.maxPrice ? parseFloat(params.maxPrice) : undefined,
  });

  // Fetch categories for filter sidebar
  const { categories } = await fetchCategories();

  return (
    <ProductsContent
      initialProducts={products}
      pagination={pagination}
      categories={categories}
    />
  );
}
