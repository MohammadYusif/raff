// src/app/products/loading.tsx
import { PageLayout } from "@/shared/components/layouts";
import { Container, Card, CardContent, Skeleton } from "@/shared/components/ui";

export default function ProductsLoading() {
  return (
    <PageLayout>
      <div className="min-h-screen bg-raff-neutral-50">
        {/* Header Skeleton */}
        <div className="border-b border-raff-neutral-200 bg-white">
          <Container className="py-8">
            <Skeleton variant="shimmer" className="mb-4 h-10 w-32" />
            <Skeleton variant="shimmer" className="mb-4 h-10 w-48" />
            <Skeleton variant="shimmer" className="h-6 w-96" />
          </Container>
        </div>

        <Container className="py-8">
          <div className="flex flex-col gap-8 lg:flex-row">
            {/* Sidebar Skeleton */}
            <aside className="w-full lg:w-64 lg:shrink-0">
              <Card>
                <CardContent className="space-y-6 p-6">
                  {/* Search skeleton */}
                  <div>
                    <Skeleton variant="shimmer" className="mb-3 h-4 w-20" />
                    <Skeleton variant="shimmer" className="h-10 w-full" />
                  </div>
                  {/* Categories skeleton */}
                  <div>
                    <Skeleton variant="shimmer" className="mb-3 h-4 w-24" />
                    <div className="space-y-2">
                      {[...Array(6)].map((_, i) => (
                        <Skeleton variant="shimmer" key={i} className="h-10 w-full" />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </aside>

            {/* Main Content Skeleton */}
            <div className="min-w-0 flex-1 space-y-6">
              {/* Sort buttons skeleton */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <Skeleton variant="shimmer" className="h-5 w-32" />
                <div className="flex gap-2">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton variant="shimmer" key={i} className="h-9 w-24" />
                  ))}
                </div>
              </div>

              {/* Products grid skeleton */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
            </div>
          </div>
        </Container>
      </div>
    </PageLayout>
  );
}
