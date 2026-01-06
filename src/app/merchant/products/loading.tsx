// src/app/merchant/products/loading.tsx
import { MerchantLayout } from "@/shared/components/layouts";
import { Container, Card, CardContent, Skeleton } from "@/shared/components/ui";

export default function MerchantProductsLoading() {
  return (
    <MerchantLayout>
      <Container className="py-8">
        {/* Header Skeleton */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Skeleton variant="shimmer" className="mb-2 h-8 w-56" />
            <Skeleton variant="shimmer" className="h-5 w-72" />
          </div>
          <Skeleton variant="shimmer" className="h-10 w-32" />
        </div>

        {/* Stats Cards Skeleton */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton variant="shimmer" className="h-4 w-28" />
                    <Skeleton variant="shimmer" className="h-7 w-20" />
                    <Skeleton variant="shimmer" className="h-3 w-32" />
                  </div>
                  <Skeleton
                    variant="shimmer"
                    className="h-10 w-10 rounded-full"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters Skeleton */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <Skeleton variant="shimmer" className="h-10 w-full lg:max-w-md" />
              <div className="flex flex-wrap gap-3">
                <Skeleton variant="shimmer" className="h-10 w-40" />
                <Skeleton variant="shimmer" className="h-10 w-40" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products List Skeleton */}
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <Card key={index} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                  <div className="flex flex-1 items-center gap-4">
                    <Skeleton
                      variant="shimmer"
                      className="h-20 w-20 rounded-lg"
                    />
                    <div className="flex-1 space-y-2">
                      <Skeleton variant="shimmer" className="h-5 w-48" />
                      <Skeleton variant="shimmer" className="h-4 w-24" />
                      <div className="flex flex-wrap gap-2">
                        <Skeleton variant="shimmer" className="h-3 w-16" />
                        <Skeleton variant="shimmer" className="h-3 w-16" />
                        <Skeleton variant="shimmer" className="h-3 w-20" />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 border-t border-raff-neutral-200 pt-4 sm:border-s sm:border-t-0 sm:ps-4 sm:pt-0">
                    <div className="space-y-2 text-center">
                      <Skeleton variant="shimmer" className="h-3 w-16" />
                      <Skeleton variant="shimmer" className="h-6 w-14" />
                    </div>
                    <div className="space-y-2 text-center">
                      <Skeleton variant="shimmer" className="h-3 w-16" />
                      <Skeleton variant="shimmer" className="h-6 w-14" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Container>
    </MerchantLayout>
  );
}
