// src/app/auth/register/loading.tsx
import { Container, Card, CardContent, Skeleton } from "@/shared/components/ui";

/**
 * Loading state for register page
 * Auth pages intentionally don't use PageLayout to provide
 * a focused, distraction-free authentication experience.
 */
export default function RegisterLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-raff-neutral-50">
      <Container maxWidth="sm">
        {/* Back to Home Button Skeleton */}
        <div className="mb-4">
          <Skeleton className="h-10 w-32" />
        </div>

        <Card className="border-raff-neutral-200">
          <CardContent className="p-8">
            {/* Logo Skeleton */}
            <div className="mb-8 text-center">
              <Skeleton className="mx-auto mb-4 h-10 w-40" />
              {/* Title Skeleton */}
              <Skeleton className="mx-auto mb-2 h-8 w-48" />
              {/* Subtitle Skeleton */}
              <Skeleton className="mx-auto h-5 w-64" />
            </div>

            {/* Form Fields Skeleton */}
            <div className="space-y-4">
              {/* Name Field */}
              <div>
                <Skeleton className="mb-2 h-5 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>

              {/* Email Field */}
              <div>
                <Skeleton className="mb-2 h-5 w-28" />
                <Skeleton className="h-10 w-full" />
              </div>

              {/* Password Field */}
              <div>
                <Skeleton className="mb-2 h-5 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>

              {/* Confirm Password Field */}
              <div>
                <Skeleton className="mb-2 h-5 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>

              {/* Submit Button */}
              <Skeleton className="h-10 w-full" />
            </div>

            {/* Login Link Skeleton */}
            <div className="mt-6 text-center">
              <Skeleton className="mx-auto h-5 w-64" />
            </div>
          </CardContent>
        </Card>
      </Container>
    </div>
  );
}
