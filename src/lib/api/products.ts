// src/lib/api/products.ts
import type {
  ProductsResponse,
  ProductResponse,
  TrendingProductsResponse,
  ProductFilters,
} from "@/types";

// ✅ FIX: Use proper environment variable check
function getApiBaseUrl(): string {
  // Server-side: Use NEXT_PUBLIC_APP_URL or construct from request
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  }
  // Client-side: Use relative URLs
  return "";
}

const API_BASE_URL = getApiBaseUrl();

export async function fetchProducts(
  filters: ProductFilters = {}
): Promise<ProductsResponse> {
  const params = new URLSearchParams();

  if (filters.page) params.set("page", filters.page.toString());
  if (filters.limit) params.set("limit", filters.limit.toString());
  if (filters.category) params.set("category", filters.category);
  if (filters.merchantId) params.set("merchantId", filters.merchantId);
  if (filters.search) params.set("search", filters.search);
  if (filters.sortBy) params.set("sortBy", filters.sortBy);
  if (filters.minPrice !== undefined)
    params.set("minPrice", filters.minPrice.toString());
  if (filters.maxPrice !== undefined)
    params.set("maxPrice", filters.maxPrice.toString());

  const url = `${API_BASE_URL}/api/products?${params.toString()}`;

  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch products");
  }

  return response.json();
}

export async function fetchTrendingProducts(
  limit: number = 8
): Promise<TrendingProductsResponse> {
  const url = `${API_BASE_URL}/api/products/trending?limit=${limit}`;

  const response = await fetch(url, {
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch trending products");
  }

  return response.json();
}

export async function fetchProduct(slug: string): Promise<ProductResponse> {
  const url = `${API_BASE_URL}/api/products/${slug}`;

  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Product not found");
    }
    throw new Error("Failed to fetch product");
  }

  return response.json();
}

export async function fetchProductsClient(
  filters: ProductFilters = {}
): Promise<ProductsResponse> {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.set(key, value.toString());
    }
  });

  const response = await fetch(`/api/products?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to fetch products");
  }

  return response.json();
}

export async function trackProductClick(productId: string): Promise<void> {
  try {
    await fetch("/api/products/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        productId,
        eventType: "CLICK",
      }),
    });
  } catch (error) {
    console.error("Failed to track click:", error);
  }
}
