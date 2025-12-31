// src/app/cart/loading.tsx
import { PageLayout } from "@/shared/components/layouts";
import { Container, Card, CardContent, Skeleton } from "@/shared/components/ui";

/**
 * Loading state for cart page
 * Matches the grid layout used in products page for consistency
 */
export default function CartLoading() {
  return (
    <PageLayout>
      <div className="min-h-screen bg-raff-neutral-50">
        {/* Header Skeleton */}
        <div className="border-b border-raff-neutral-200 bg-white">
          <Container className="py-8">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
              <div className="flex-1">
                <Skeleton className="mb-2 h-9 w-32" />
                <Skeleton className="h-5 w-24" />
              </div>
            </div>
          </Container>
        </div>

        <Container className="py-8">
          {/* Auth Notice Skeleton (optional) */}
          <Card className="mb-6">
            <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <Skeleton className="mb-2 h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-32" />
              </div>
            </CardContent>
          </Card>

          {/* Main Grid Layout */}
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            {/* Products Grid */}
            <div>
              {/* Summary Info Skeleton */}
              <div className="mb-6 flex items-center justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-9 w-24" />
              </div>

              {/* Product Cards Grid - Matching Products Page */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    {/* Product Image Skeleton */}
                    <Skeleton className="aspect-square w-full" />

                    {/* Product Info Skeleton */}
                    <CardContent className="space-y-3 p-4">
                      {/* Category */}
                      <Skeleton className="h-3 w-20" />
                      {/* Merchant */}
                      <Skeleton className="h-3 w-24" />
                      {/* Title */}
                      <Skeleton className="h-5 w-full" />
                      <Skeleton className="h-5 w-3/4" />
                      {/* Price */}
                      <Skeleton className="h-6 w-24" />
                      {/* Button */}
                      <Skeleton className="h-9 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Summary Sidebar Skeleton */}
            <aside className="lg:sticky lg:top-24 lg:h-fit">
              <Card>
                <CardContent className="space-y-4 p-6">
                  <Skeleton className="h-7 w-32" />

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                    <div className="flex justify-between">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                  </div>

                  <div className="border-t border-raff-neutral-200 pt-4">
                    <div className="mb-4 flex justify-between">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </div>

                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />

                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>
        </Container>
      </div>
    </PageLayout>
  );
}
