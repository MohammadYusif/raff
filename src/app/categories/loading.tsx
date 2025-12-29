// src/app/categories/loading.tsx
import { PageLayout } from "@/shared/components/layouts";
import { Container, Card, CardContent, Skeleton } from "@/shared/components/ui";

export default function CategoriesLoading() {
  return (
    <PageLayout>
      <div className="min-h-screen bg-raff-neutral-50">
        {/* Header Skeleton */}
        <div className="border-b border-raff-neutral-200 bg-white">
          <Container className="py-8">
            <Skeleton className="mb-4 h-10 w-32" />
            <Skeleton className="mb-4 h-10 w-48" />
            <Skeleton className="h-6 w-96" />
          </Container>
        </div>

        <Container className="py-8">
          {/* Categories Grid Skeleton */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-12 w-12 rounded-lg" />
                      <Skeleton className="h-6 w-32" />
                    </div>
                    <Skeleton className="h-6 w-8" />
                  </div>
                  <Skeleton className="mb-4 h-10 w-full" />
                  <Skeleton className="h-5 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Bottom button skeleton */}
          <div className="mt-12 text-center">
            <Skeleton className="mx-auto h-11 w-48" />
          </div>
        </Container>
      </div>
    </PageLayout>
  );
}
