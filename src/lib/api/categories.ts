// src/lib/api/categories.ts
import type { CategoriesResponse } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Fetch all categories
 */
export async function fetchCategories(): Promise<CategoriesResponse> {
  const url = `${API_BASE_URL}/api/categories`;
  
  const response = await fetch(url, {
    next: { revalidate: 3600 }, // Cache for 1 hour
  });

  if (!response.ok) {
    throw new Error('Failed to fetch categories');
  }

  return response.json();
}

/**
 * Client-side category fetch
 */
export async function fetchCategoriesClient(): Promise<CategoriesResponse> {
  const response = await fetch('/api/categories');

  if (!response.ok) {
    throw new Error('Failed to fetch categories');
  }

  return response.json();
}
