// src/app/orders/loading.tsx
import { PageLayout } from "@/shared/components/layouts";
import { Container, Card, CardContent, Skeleton } from "@/shared/components/ui";

export default function OrdersLoading() {
  return (
    <PageLayout>
      <Container className="py-8 pt-20">
        <div className="mb-8">
          <Skeleton variant="shimmer" className="mb-3 h-8 w-48" />
          <Skeleton variant="shimmer" className="h-5 w-80" />
        </div>

        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Skeleton variant="shimmer" className="mb-2 h-5 w-40" />
                    <Skeleton variant="shimmer" className="h-4 w-28" />
                  </div>
                  <Skeleton variant="shimmer" className="h-6 w-24 rounded-full" />
                </div>

                <div className="mt-6 grid gap-6 md:grid-cols-[1fr,auto]">
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <Skeleton
                        variant="shimmer"
                        className="h-20 w-20 rounded-lg"
                      />
                      <div className="flex-1 space-y-2">
                        <Skeleton variant="shimmer" className="h-4 w-48" />
                        <Skeleton variant="shimmer" className="h-4 w-32" />
                        <Skeleton variant="shimmer" className="h-4 w-40" />
                      </div>
                    </div>

                    <Skeleton variant="shimmer" className="h-8 w-32" />

                    <div className="space-y-2">
                      <Skeleton variant="shimmer" className="h-4 w-40" />
                      <Skeleton variant="shimmer" className="h-4 w-52" />
                      <Skeleton variant="shimmer" className="h-4 w-44" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <Skeleton variant="shimmer" className="h-9 w-36" />
                    <Skeleton variant="shimmer" className="h-9 w-36" />
                    <Skeleton variant="shimmer" className="h-9 w-36" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Container>
    </PageLayout>
  );
}
