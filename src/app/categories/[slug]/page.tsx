// src/app/categories/[slug]/page.tsx
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { fetchProducts, fetchCategories } from "@/lib/api";
import { CategoryDetailContent } from "./CategoryDetailContent";

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

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const { categories } = await fetchCategories();
    const category = categories.find((c) => c.slug === slug);

    if (!category) {
      return {
        title: "Category Not Found - Raff",
      };
    }

    return {
      title: `${category.nameAr || category.name} - Raff`,
      description: category.descriptionAr || category.description || "",
    };
  } catch {
    return {
      title: "Category - Raff",
    };
  }
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  // Await params (Next.js 15 requirement)
  const { slug } = await params;
  const searchParamsResolved = await searchParams;

  // Fetch all categories to find the current one
  const { categories } = await fetchCategories();
  const category = categories.find((c) => c.slug === slug);

  // If category not found, show 404
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
  const { products, pagination } = await fetchProducts({
    page: searchParamsResolved.page ? parseInt(searchParamsResolved.page) : 1,
    limit: 12,
    category: slug, // Filter by category slug
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
    <CategoryDetailContent
      category={category}
      initialProducts={products}
      pagination={pagination}
    />
  );
}
