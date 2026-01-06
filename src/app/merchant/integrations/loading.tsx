// src/app/merchant/integrations/loading.tsx
import { MerchantLayout } from "@/shared/components/layouts";
import {
  Container,
  Card,
  CardContent,
  CardHeader,
  Skeleton,
} from "@/shared/components/ui";

export default function MerchantIntegrationsLoading() {
  return (
    <MerchantLayout>
      <div className="min-h-screen bg-raff-neutral-50">
        {/* Header Skeleton */}
        <div className="border-b border-raff-neutral-200 bg-white">
          <Container className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <Skeleton variant="shimmer" className="mb-2 h-8 w-56" />
                <Skeleton variant="shimmer" className="h-5 w-72" />
              </div>
              <Skeleton variant="shimmer" className="h-10 w-40" />
            </div>
          </Container>
        </div>

        <Container className="py-8">
          <div className="space-y-8">
            {/* Security Notice Skeleton */}
            <Card>
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <Skeleton
                    variant="shimmer"
                    className="h-12 w-12 rounded-full"
                  />
                  <div className="flex-1 space-y-2">
                    <Skeleton variant="shimmer" className="h-5 w-40" />
                    <Skeleton variant="shimmer" className="h-4 w-full" />
                    <Skeleton variant="shimmer" className="h-4 w-5/6" />
                    <div className="space-y-2">
                      <Skeleton variant="shimmer" className="h-4 w-56" />
                      <Skeleton variant="shimmer" className="h-4 w-48" />
                      <Skeleton variant="shimmer" className="h-4 w-52" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Platforms Skeleton */}
            <div>
              <Skeleton variant="shimmer" className="mb-4 h-6 w-40" />
              <div className="grid gap-6 lg:grid-cols-2">
                {Array.from({ length: 2 }).map((_, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <Skeleton
                          variant="shimmer"
                          className="h-12 w-12 rounded-lg"
                        />
                        <div className="space-y-2">
                          <Skeleton variant="shimmer" className="h-5 w-32" />
                          <Skeleton variant="shimmer" className="h-4 w-48" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Skeleton variant="shimmer" className="h-10 w-full" />
                      <div className="space-y-2">
                        <Skeleton variant="shimmer" className="h-4 w-56" />
                        <Skeleton variant="shimmer" className="h-4 w-52" />
                        <Skeleton variant="shimmer" className="h-4 w-48" />
                      </div>
                      <Skeleton variant="shimmer" className="h-10 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Help Section Skeleton */}
            <Card>
              <CardHeader>
                <Skeleton variant="shimmer" className="h-6 w-40" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="space-y-2">
                    <Skeleton variant="shimmer" className="h-4 w-48" />
                    <Skeleton variant="shimmer" className="h-4 w-full" />
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
