// src/app/merchants/[id]/loading.tsx
import { PageLayout } from "@/shared/components/layouts";
import { Container, Card, CardContent, Skeleton } from "@/shared/components/ui";

export default function MerchantDetailLoading() {
  return (
    <PageLayout>
      <div className="min-h-screen overflow-x-hidden bg-raff-neutral-50">
        {/* Header Skeleton */}
        <div className="border-b border-raff-neutral-200 bg-white">
          <Container className="py-8">
            <Skeleton variant="shimmer" className="mb-4 h-10 w-32" />

            {/* Merchant Header */}
            <div className="mb-6 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              {/* Merchant Info */}
              <div className="flex items-start gap-4">
                <Skeleton variant="shimmer" className="h-20 w-20 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <Skeleton variant="shimmer" className="mb-2 h-10 w-64" />
                  <Skeleton variant="shimmer" className="mb-3 h-6 w-96" />
                  <div className="flex flex-wrap gap-4">
                    <Skeleton variant="shimmer" className="h-5 w-32" />
                    <Skeleton variant="shimmer" className="h-5 w-40" />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex shrink-0 flex-col gap-3">
                <Skeleton variant="shimmer" className="h-8 w-24" />
                <Skeleton variant="shimmer" className="h-10 w-32" />
              </div>
            </div>
          </Container>
        </div>

        <Container className="py-8">
          {/* Search & Sort Skeleton */}
          <div className="mb-6 space-y-4">
            <div className="flex gap-2">
              <Skeleton variant="shimmer" className="h-10 flex-1" />
              <Skeleton variant="shimmer" className="h-10 w-10" />
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Skeleton variant="shimmer" className="h-5 w-32" />
              <div className="flex gap-2 overflow-x-auto pb-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton variant="shimmer" key={i} className="h-9 w-24 shrink-0" />
                ))}
              </div>
            </div>
          </div>

          {/* Products Grid Skeleton */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(12)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton variant="shimmer" className="aspect-square w-full" />
                <CardContent className="space-y-3 p-4">
                  <Skeleton variant="shimmer" className="h-4 w-2/3" />
                  <Skeleton variant="shimmer" className="h-5 w-full" />
                  <Skeleton variant="shimmer" className="h-6 w-1/2" />
                  <Skeleton variant="shimmer" className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </Container>
      </div>
    </PageLayout>
  );
}
