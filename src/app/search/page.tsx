// src/app/search/page.tsx
import { redirect } from "next/navigation";

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
    sortBy?: string;
    category?: string;
  }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;

  // Build the products URL with all search params
  const productParams = new URLSearchParams();

  if (params.q) {
    productParams.set("search", params.q);
  }
  if (params.page) {
    productParams.set("page", params.page);
  }
  if (params.sortBy) {
    productParams.set("sortBy", params.sortBy);
  }
  if (params.category) {
    productParams.set("category", params.category);
  }

  // Redirect to products page with search query
  redirect(`/products?${productParams.toString()}`);
}
