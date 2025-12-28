// src/app/trending/page.tsx
import { fetchTrendingProducts } from "@/lib/api";
import { TrendingContent } from "./TrendingContent";

export const metadata = {
  title: "Trending Products - Raff",
  description: "Discover the most popular trending products",
};

export default async function TrendingPage() {
  // Fetch trending products (no filters needed, sorted by trendingScore)
  const { products } = await fetchTrendingProducts(20); // Get top 20 trending

  return <TrendingContent products={products} />;
}
