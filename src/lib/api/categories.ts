// src/lib/api/categories.ts
import type { CategoriesResponse } from "@/types";

// ✅ FIX: Use proper environment variable check
function getApiBaseUrl(): string {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  }
  return "";
}

const API_BASE_URL = getApiBaseUrl();

export async function fetchCategories(): Promise<CategoriesResponse> {
  const url = `${API_BASE_URL}/api/categories`;

  const response = await fetch(url, {
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch categories");
  }

  return response.json();
}

export async function fetchCategoriesClient(): Promise<CategoriesResponse> {
  const response = await fetch("/api/categories");

  if (!response.ok) {
    throw new Error("Failed to fetch categories");
  }

  return response.json();
}
