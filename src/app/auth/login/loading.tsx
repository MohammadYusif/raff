// src/app/auth/login/loading.tsx
import { Container, Card, CardContent, Skeleton } from "@/shared/components/ui";

/**
 * Loading state for login page
 * Auth pages intentionally don't use PageLayout to provide
 * a focused, distraction-free authentication experience.
 */
export default function LoginLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-raff-neutral-50">
      <Container maxWidth="sm">
        {/* Back to Home Button Skeleton */}
        <div className="mb-4">
          <Skeleton variant="shimmer" className="h-10 w-32" />
        </div>

        <Card className="border-raff-neutral-200">
          <CardContent className="p-8">
            {/* Logo Skeleton */}
            <div className="mb-8 text-center">
              <Skeleton variant="shimmer" className="mx-auto mb-4 h-10 w-40" />
              {/* Title Skeleton */}
              <Skeleton variant="shimmer" className="mx-auto mb-2 h-8 w-32" />
              {/* Subtitle Skeleton */}
              <Skeleton variant="shimmer" className="mx-auto h-5 w-48" />
            </div>

            {/* Form Fields Skeleton */}
            <div className="space-y-4">
              {/* Email Field */}
              <div>
                <Skeleton variant="shimmer" className="mb-2 h-5 w-24" />
                <Skeleton variant="shimmer" className="h-10 w-full" />
              </div>

              {/* Password Field */}
              <div>
                <Skeleton variant="shimmer" className="mb-2 h-5 w-20" />
                <Skeleton variant="shimmer" className="h-10 w-full" />
              </div>

              {/* Submit Button */}
              <Skeleton variant="shimmer" className="h-10 w-full" />
            </div>

            {/* Register Link Skeleton */}
            <div className="mt-6 text-center">
              <Skeleton variant="shimmer" className="mx-auto h-5 w-64" />
            </div>
          </CardContent>
        </Card>
      </Container>
    </div>
  );
}
