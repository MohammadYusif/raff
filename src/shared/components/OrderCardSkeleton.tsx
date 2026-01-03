// src/shared/components/OrderCardSkeleton.tsx
"use client";

import { Card, CardContent } from "@/shared/components/ui";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ShoppingBag } from "lucide-react";

interface OrderCardSkeletonProps {
  showTracking?: boolean;
  showMultipleTimeline?: boolean;
}

/**
 * Order Card Skeleton Component
 *
 * Reusable skeleton for order cards
 * Used in both loading.tsx and during pagination
 *
 * @param showTracking - Whether to show tracking number skeleton
 * @param showMultipleTimeline - Show extended timeline items
 */
export function OrderCardSkeleton({
  showTracking = false,
  showMultipleTimeline = false,
}: OrderCardSkeletonProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          {/* Left Section - Order Info */}
          <div className="flex-1 space-y-4">
            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <Skeleton variant="shimmer" className="h-6 w-24 rounded-full" />
              <Skeleton variant="shimmer" className="h-5 w-32" />
            </div>

            {/* Order Number */}
            <Skeleton variant="shimmer" className="h-5 w-40" />

            {/* Product Info */}
            <div className="flex gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-raff-neutral-100">
                <ShoppingBag className="h-8 w-8 text-raff-neutral-400 animate-pulse" />
              </div>
              <div className="flex-1 space-y-2">
                <Skeleton variant="shimmer" className="h-5 w-3/4" />
                <Skeleton variant="shimmer" className="h-4 w-1/2" />
                <Skeleton variant="shimmer" className="h-4 w-1/3" />
              </div>
            </div>

            {/* Price */}
            <div className="space-y-1">
              <Skeleton variant="shimmer" className="h-4 w-16" />
              <Skeleton variant="shimmer" className="h-8 w-32" />
            </div>

            {/* Tracking Number (conditional) */}
            {showTracking && (
              <div className="rounded-lg bg-raff-neutral-50 p-3">
                <Skeleton variant="shimmer" className="mb-2 h-4 w-32" />
                <Skeleton variant="shimmer" className="h-4 w-48" />
              </div>
            )}
          </div>

          {/* Right Section - Timeline & Actions */}
          <div className="w-full space-y-4 lg:w-80">
            {/* Timeline */}
            <div className="rounded-lg border border-raff-neutral-200 p-4">
              <Skeleton variant="shimmer" className="mb-3 h-5 w-32" />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton
                    variant="shimmer"
                    className="h-4 w-4 rounded-full"
                  />
                  <Skeleton variant="shimmer" className="h-4 flex-1" />
                </div>
                {showMultipleTimeline && (
                  <>
                    <div className="flex items-center gap-2">
                      <Skeleton
                        variant="shimmer"
                        className="h-4 w-4 rounded-full"
                      />
                      <Skeleton variant="shimmer" className="h-4 flex-1" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton
                        variant="shimmer"
                        className="h-4 w-4 rounded-full"
                      />
                      <Skeleton variant="shimmer" className="h-4 flex-1" />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <Skeleton variant="shimmer" className="h-10 w-full" />
              <Skeleton variant="shimmer" className="h-10 w-full" />
              {showTracking && (
                <Skeleton variant="shimmer" className="h-10 w-full" />
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Orders List Skeleton
 *
 * Shows multiple order card skeletons with variation
 */
interface OrdersListSkeletonProps {
  count?: number;
}

export function OrdersListSkeleton({ count = 3 }: OrdersListSkeletonProps) {
  return (
    <div className="space-y-4">
      {[...Array(count)].map((_, index) => (
        <OrderCardSkeleton
          key={index}
          showTracking={index === 0}
          showMultipleTimeline={index < 2}
        />
      ))}
    </div>
  );
}
