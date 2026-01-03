// src/app/trending/loading.tsx
import { PageLayout } from "@/shared/components/layouts";
import { Container, Card, CardContent, Skeleton } from "@/shared/components/ui";

export default function TrendingLoading() {
  return (
    <PageLayout>
      <div className="min-h-screen bg-raff-neutral-50">
        {/* Header Skeleton */}
        <div className="border-b border-raff-neutral-200 bg-white">
          <Container className="py-8">
            <Skeleton variant="shimmer" className="mb-4 h-10 w-32" />
            <div className="mb-4 flex items-center gap-3">
              <Skeleton variant="shimmer" className="h-10 w-10 rounded-full" />
              <Skeleton variant="shimmer" className="h-10 w-48" />
            </div>
            <Skeleton variant="shimmer" className="h-6 w-96" />
          </Container>
        </div>

        <Container className="py-8">
          {/* Info Banner Skeleton */}
          <Card className="mb-8">
            <CardContent className="p-4">
              <Skeleton variant="shimmer" className="h-16 w-full" />
            </CardContent>
          </Card>

          {/* Products Grid Skeleton */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(20)].map((_, i) => (
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

          {/* Bottom link skeleton */}
          <div className="mt-12 text-center">
            <Skeleton variant="shimmer" className="mx-auto h-11 w-48" />
          </div>
        </Container>
      </div>
    </PageLayout>
  );
}
