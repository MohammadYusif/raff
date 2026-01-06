// src/app/merchant/complete-registration/loading.tsx
import { PageLayout } from "@/shared/components/layouts";
import {
  Container,
  Card,
  CardContent,
  CardHeader,
  Skeleton,
} from "@/shared/components/ui";

export default function CompleteRegistrationLoading() {
  return (
    <PageLayout navbarVariant="minimal">
      <div className="min-h-screen bg-raff-neutral-50">
        {/* Header Skeleton */}
        <div className="border-b border-raff-neutral-200 bg-white">
          <Container className="py-6">
            <div className="text-center">
              <Skeleton
                variant="shimmer"
                className="mx-auto mb-4 h-12 w-12 rounded-full"
              />
              <Skeleton variant="shimmer" className="mx-auto mb-2 h-8 w-56" />
              <Skeleton variant="shimmer" className="mx-auto h-5 w-72" />
            </div>
          </Container>
        </div>

        <Container className="py-12">
          <div className="mx-auto max-w-lg space-y-8">
            {/* Steps Card Skeleton */}
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <Skeleton
                        variant="shimmer"
                        className="mt-1 h-5 w-5 rounded-full"
                      />
                      <div className="flex-1 space-y-2">
                        <Skeleton variant="shimmer" className="h-4 w-48" />
                        <Skeleton variant="shimmer" className="h-4 w-64" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Form Card Skeleton */}
            <Card>
              <CardHeader className="space-y-2">
                <Skeleton variant="shimmer" className="h-6 w-40" />
                <Skeleton variant="shimmer" className="h-4 w-56" />
              </CardHeader>
              <CardContent className="space-y-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="space-y-2">
                    <Skeleton variant="shimmer" className="h-4 w-32" />
                    <Skeleton variant="shimmer" className="h-10 w-full" />
                  </div>
                ))}
                <Skeleton variant="shimmer" className="h-11 w-full" />
              </CardContent>
            </Card>

            {/* Info Card Skeleton */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Skeleton
                    variant="shimmer"
                    className="mt-1 h-5 w-5 rounded-full"
                  />
                  <div className="flex-1 space-y-2">
                    <Skeleton variant="shimmer" className="h-4 w-32" />
                    <Skeleton variant="shimmer" className="h-4 w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </Container>
      </div>
    </PageLayout>
  );
}
