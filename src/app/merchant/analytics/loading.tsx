// src/app/merchant/analytics/loading.tsx
import { MerchantLayout } from "@/shared/components/layouts";
import {
  Container,
  Card,
  CardContent,
  CardHeader,
  Skeleton,
} from "@/shared/components/ui";

export default function MerchantAnalyticsLoading() {
  return (
    <MerchantLayout>
      <Container className="py-8">
        {/* Header Skeleton */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Skeleton variant="shimmer" className="mb-2 h-8 w-52" />
            <Skeleton variant="shimmer" className="h-5 w-72" />
          </div>
          <Skeleton variant="shimmer" className="h-10 w-40" />
        </div>

        {/* Metrics Skeleton */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <Skeleton
                    variant="shimmer"
                    className="h-8 w-8 rounded-lg"
                  />
                  <Skeleton variant="shimmer" className="h-4 w-12" />
                </div>
                <Skeleton variant="shimmer" className="mb-2 h-4 w-24" />
                <Skeleton variant="shimmer" className="h-7 w-20" />
                <Skeleton variant="shimmer" className="mt-2 h-3 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top Products Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton variant="shimmer" className="h-6 w-44" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border border-raff-neutral-200 p-3"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton
                      variant="shimmer"
                      className="h-8 w-8 rounded-lg"
                    />
                    <div className="space-y-2">
                      <Skeleton variant="shimmer" className="h-4 w-40" />
                      <Skeleton variant="shimmer" className="h-3 w-48" />
                    </div>
                  </div>
                  <Skeleton variant="shimmer" className="h-4 w-16" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Traffic Sources Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton variant="shimmer" className="h-6 w-44" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-raff-neutral-200 p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <Skeleton variant="shimmer" className="h-4 w-28" />
                    <Skeleton variant="shimmer" className="h-4 w-16" />
                  </div>
                  <div className="flex gap-4">
                    <Skeleton variant="shimmer" className="h-3 w-20" />
                    <Skeleton variant="shimmer" className="h-3 w-24" />
                    <Skeleton variant="shimmer" className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Performance Trend Skeleton */}
        <Card className="mt-6">
          <CardHeader>
            <Skeleton variant="shimmer" className="h-6 w-52" />
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="grid grid-cols-4 gap-4 rounded-lg border border-raff-neutral-200 p-3"
              >
                <Skeleton variant="shimmer" className="h-4 w-full" />
                <Skeleton variant="shimmer" className="h-4 w-full" />
                <Skeleton variant="shimmer" className="h-4 w-full" />
                <Skeleton variant="shimmer" className="h-4 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </Container>
    </MerchantLayout>
  );
}
