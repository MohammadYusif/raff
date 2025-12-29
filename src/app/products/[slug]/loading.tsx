// src/app/products/[slug]/loading.tsx
import { PageLayout } from "@/shared/components/layouts";
import { Container, Card, CardContent, Skeleton } from "@/shared/components/ui";

export default function ProductDetailLoading() {
  return (
    <PageLayout>
      <div className="min-h-screen bg-raff-neutral-50">
        {/* Breadcrumb Skeleton */}
        <div className="border-b border-raff-neutral-200 bg-white">
          <Container className="py-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-4" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-4" />
              <Skeleton className="h-5 w-32" />
            </div>
          </Container>
        </div>

        <Container className="py-8 sm:py-12">
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Product Images Skeleton */}
            <div className="space-y-4">
              <Card className="overflow-hidden">
                <Skeleton className="aspect-square w-full" />
              </Card>
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-5 w-32" />
              </div>
            </div>

            {/* Product Info Skeleton */}
            <div className="space-y-6">
              {/* Title Card */}
              <Card>
                <CardContent className="space-y-4 p-6">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-10 w-full" />
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-5 w-4" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                </CardContent>
              </Card>

              {/* Price Card */}
              <Card>
                <CardContent className="space-y-3 p-6">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                  <Skeleton className="h-12 w-40" />
                  <Skeleton className="h-4 w-48" />
                </CardContent>
              </Card>

              {/* Description Card */}
              <Card>
                <CardContent className="space-y-3 p-6">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>

              {/* Merchant Card */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-5 w-5 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Separator */}
              <Skeleton className="h-px w-full" />

              {/* Action Buttons */}
              <div className="space-y-3">
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-px w-full" />
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
              </div>

              {/* Info Card */}
              <Card>
                <CardContent className="p-4">
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
        </Container>
      </div>
    </PageLayout>
  );
}
