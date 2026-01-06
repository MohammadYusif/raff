// src/app/merchant/join/loading.tsx
import { PageLayout } from "@/shared/components/layouts";
import { Container, Card, CardContent, Skeleton } from "@/shared/components/ui";

export default function MerchantJoinLoading() {
  return (
    <PageLayout navbarVariant="minimal">
      <div className="min-h-screen from-raff-neutral-50 to-white">
        <Container className="py-12 md:py-20">
          {/* Hero Skeleton */}
          <div className="mb-12 text-center">
            <Skeleton variant="shimmer" className="mx-auto mb-4 h-10 w-64" />
            <Skeleton variant="shimmer" className="mx-auto h-5 w-80" />
          </div>

          {/* Main CTA Card Skeleton */}
          <Card className="mx-auto mb-12 max-w-2xl border-raff-neutral-200 shadow-lg">
            <CardContent className="p-8 md:p-12">
              <div className="mb-8 space-y-3 text-center">
                <Skeleton variant="shimmer" className="mx-auto h-8 w-48" />
                <Skeleton variant="shimmer" className="mx-auto h-4 w-72" />
                <Skeleton variant="shimmer" className="mx-auto h-4 w-40" />
              </div>
              <div className="space-y-4">
                <Skeleton variant="shimmer" className="h-20 w-full" />
                <Skeleton variant="shimmer" className="h-20 w-full" />
              </div>
            </CardContent>
          </Card>

          {/* Benefits Grid Skeleton */}
          <div className="mb-12">
            <Skeleton variant="shimmer" className="mx-auto mb-8 h-7 w-56" />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Card key={index} className="border-raff-neutral-200">
                  <CardContent className="p-6 text-center">
                    <Skeleton
                      variant="shimmer"
                      className="mx-auto mb-4 h-12 w-12 rounded-full"
                    />
                    <Skeleton variant="shimmer" className="mx-auto mb-2 h-4 w-24" />
                    <Skeleton variant="shimmer" className="mx-auto h-4 w-32" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* How It Works Skeleton */}
          <div className="mb-12">
            <Skeleton variant="shimmer" className="mx-auto mb-8 h-7 w-56" />
            <div className="grid gap-6 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Card key={index} className="border-raff-neutral-200">
                  <CardContent className="p-6">
                    <Skeleton
                      variant="shimmer"
                      className="mb-4 h-12 w-12 rounded-full"
                    />
                    <Skeleton variant="shimmer" className="mb-2 h-4 w-32" />
                    <Skeleton variant="shimmer" className="h-4 w-40" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Features List Skeleton */}
          <Card className="mb-12 border-raff-neutral-200">
            <CardContent className="p-8">
              <Skeleton variant="shimmer" className="mx-auto mb-6 h-7 w-56" />
              <div className="grid gap-4 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Skeleton
                      variant="shimmer"
                      className="h-5 w-5 rounded-full"
                    />
                    <Skeleton variant="shimmer" className="h-4 w-40" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Footer Skeleton */}
          <div className="text-center">
            <Skeleton variant="shimmer" className="mx-auto mb-4 h-4 w-56" />
            <Skeleton variant="shimmer" className="mx-auto mb-6 h-10 w-40" />
            <Skeleton variant="shimmer" className="mx-auto h-4 w-48" />
          </div>
        </Container>
      </div>
    </PageLayout>
  );
}
