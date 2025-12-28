// src/app/categories/page.tsx
import { fetchCategories } from "@/lib/api";
import { CategoriesContent } from "./CategoriesContent";

export const metadata = {
  title: "Categories - Raff",
  description: "Browse products by category",
};

export default async function CategoriesPage() {
  // Fetch all categories with product counts
  const { categories } = await fetchCategories();

  return <CategoriesContent categories={categories} />;
}
