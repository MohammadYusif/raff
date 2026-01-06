// src/app/merchant/settings/loading.tsx
import { MerchantLayout } from "@/shared/components/layouts";
import {
  Container,
  Card,
  CardContent,
  CardHeader,
  Skeleton,
} from "@/shared/components/ui";

export default function MerchantSettingsLoading() {
  return (
    <MerchantLayout>
      <Container className="py-8">
        {/* Header Skeleton */}
        <div className="mb-6 space-y-2">
          <Skeleton variant="shimmer" className="h-8 w-56" />
          <Skeleton variant="shimmer" className="h-5 w-72" />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Sidebar Skeleton */}
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton
                key={index}
                variant="shimmer"
                className="h-11 w-full"
              />
            ))}
          </div>

          {/* Content Skeleton */}
          <div className="space-y-6 lg:col-span-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={index}>
                <CardHeader className="space-y-2">
                  <Skeleton variant="shimmer" className="h-6 w-40" />
                  <Skeleton variant="shimmer" className="h-4 w-64" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Skeleton variant="shimmer" className="h-4 w-24" />
                    <Skeleton variant="shimmer" className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton variant="shimmer" className="h-4 w-28" />
                    <Skeleton variant="shimmer" className="h-10 w-full" />
                    <Skeleton variant="shimmer" className="h-3 w-40" />
                  </div>
                  <Skeleton variant="shimmer" className="h-10 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </Container>
    </MerchantLayout>
  );
}
