// src/app/merchant/orders/loading.tsx
import { MerchantLayout } from "@/shared/components/layouts";
import { Container, Card, CardContent, Skeleton } from "@/shared/components/ui";

export default function MerchantOrdersLoading() {
  return (
    <MerchantLayout>
      <div className="min-h-screen bg-raff-neutral-50">
        {/* Header Skeleton */}
        <div className="border-b border-raff-neutral-200 bg-white">
          <Container className="py-6">
            <Skeleton variant="shimmer" className="mb-2 h-8 w-48" />
            <Skeleton variant="shimmer" className="h-5 w-72" />
          </Container>
        </div>

        <Container className="py-8">
          <Card>
            <CardContent className="p-12 text-center">
              <Skeleton
                variant="shimmer"
                className="mx-auto mb-4 h-16 w-16 rounded-full"
              />
              <Skeleton
                variant="shimmer"
                className="mx-auto mb-3 h-6 w-48"
              />
              <Skeleton variant="shimmer" className="mx-auto h-4 w-64" />
            </CardContent>
          </Card>
        </Container>
      </div>
    </MerchantLayout>
  );
}
