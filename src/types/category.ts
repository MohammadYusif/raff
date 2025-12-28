// src/types/category.ts
import { Category } from '@prisma/client';

/**
 * Category with product count and children
 */
export type CategoryWithCount = Category & {
  _count: {
    products: number;
  };
  children: Category[];
};

/**
 * Categories API response
 */
export interface CategoriesResponse {
  categories: CategoryWithCount[];
}
