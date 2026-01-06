// src/app/merchant/dashboard/loading.tsx
import { MerchantLayout } from "@/shared/components/layouts";
import {
  Container,
  Card,
  CardContent,
  CardHeader,
  Skeleton,
} from "@/shared/components/ui";

export default function MerchantDashboardLoading() {
  return (
    <MerchantLayout>
      <div className="h-full bg-raff-neutral-50">
        {/* Header Skeleton */}
        <div className="border-b border-raff-neutral-200 bg-white">
          <Container className="py-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Skeleton variant="shimmer" className="mb-2 h-8 w-48" />
                <Skeleton variant="shimmer" className="h-5 w-64" />
              </div>
              <Skeleton variant="shimmer" className="h-10 w-36" />
            </div>
          </Container>
        </div>

        <Container className="py-8">
          <div className="space-y-8">
            {/* Store Connection Card Skeleton */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center gap-6 text-center md:flex-row md:text-start">
                  <Skeleton
                    variant="shimmer"
                    className="h-16 w-16 rounded-full"
                  />
                  <div className="flex-1 space-y-3">
                    <Skeleton variant="shimmer" className="h-6 w-48" />
                    <Skeleton variant="shimmer" className="h-4 w-full max-w-md" />
                    <Skeleton variant="shimmer" className="h-4 w-64" />
                    <div className="flex flex-wrap justify-center gap-3 md:justify-start">
                      <Skeleton variant="shimmer" className="h-10 w-40" />
                      <Skeleton variant="shimmer" className="h-10 w-40" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Cards Skeleton */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-3">
                        <Skeleton variant="shimmer" className="h-4 w-28" />
                        <Skeleton variant="shimmer" className="h-8 w-20" />
                      </div>
                      <Skeleton
                        variant="shimmer"
                        className="h-12 w-12 rounded-full"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Metrics Skeleton */}
            <div className="grid gap-6 lg:grid-cols-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <Card key={index}>
                  <CardHeader className="space-y-2">
                    <Skeleton variant="shimmer" className="h-6 w-48" />
                    <Skeleton variant="shimmer" className="h-4 w-64" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Skeleton variant="shimmer" className="h-10 w-32" />
                    <div className="space-y-2">
                      <Skeleton variant="shimmer" className="h-4 w-full" />
                      <Skeleton variant="shimmer" className="h-4 w-5/6" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Quick Actions Skeleton */}
            <Card>
              <CardHeader>
                <Skeleton variant="shimmer" className="h-6 w-40" />
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton
                      key={index}
                      variant="shimmer"
                      className="h-10 w-full"
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Getting Started Skeleton */}
            <Card>
              <CardHeader className="space-y-2">
                <Skeleton variant="shimmer" className="h-6 w-44" />
                <Skeleton variant="shimmer" className="h-4 w-72" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <Skeleton
                      variant="shimmer"
                      className="mt-1 h-5 w-5 rounded-full"
                    />
                    <div className="flex-1 space-y-2">
                      <Skeleton variant="shimmer" className="h-4 w-56" />
                      <Skeleton variant="shimmer" className="h-4 w-72" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </Container>
      </div>
    </MerchantLayout>
  );
}
