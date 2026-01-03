// src/app/cart/loading.tsx
import { PageLayout } from "@/shared/components/layouts";
import { Container, Card, CardContent, Skeleton } from "@/shared/components/ui";
import { ShoppingCart } from "lucide-react";

/**
 * Loading state for cart page
 * Shows skeleton matching the empty cart layout with auth notice
 */
export default function CartLoading() {
  return (
    <PageLayout>
      <div className="min-h-screen bg-raff-neutral-50">
        {/* Header */}
        <div className="border-b border-raff-neutral-200 bg-white">
          <Container className="py-6 md:py-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-raff-primary/10 md:h-12 md:w-12">
                <ShoppingCart className="h-5 w-5 text-raff-primary md:h-6 md:w-6" />
              </div>
              <div>
                <Skeleton className="mb-2 h-7 w-32 md:h-8 md:w-40" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          </Container>
        </div>

        <Container className="py-8 md:py-12">
          <div className="mx-auto max-w-2xl">
            {/* Empty Cart Card Skeleton */}
            <Card className="overflow-hidden">
              <CardContent className="p-8 md:p-12">
                <div className="flex flex-col items-center text-center">
                  {/* Icon Skeleton */}
                  <div className="mb-6 rounded-full bg-raff-neutral-100 p-8">
                    <Skeleton className="h-16 w-16 rounded-full md:h-20 md:w-20" />
                  </div>

                  {/* Title Skeleton */}
                  <Skeleton className="mb-3 h-9 w-64 md:h-10 md:w-80" />

                  {/* Description Skeleton */}
                  <Skeleton className="mb-8 h-6 w-48 md:w-64" />

                  {/* Button Skeleton */}
                  <Skeleton className="mb-8 h-11 w-48" />

                  {/* Auth Notice Section Skeleton */}
                  <div className="w-full border-t border-raff-neutral-200 pt-8">
                    <div className="rounded-xl from-raff-accent/10 via-raff-accent/5 to-transparent p-6">
                      <div className="flex flex-col items-center gap-4 sm:flex-row">
                        {/* Icon Skeleton */}
                        <Skeleton className="h-12 w-12 shrink-0 rounded-lg" />

                        {/* Text Skeleton */}
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-4 w-full max-w-md" />
                        </div>

                        {/* Buttons Skeleton */}
                        <div className="flex gap-3">
                          <Skeleton className="h-9 w-24" />
                          <Skeleton className="h-9 w-20" />
                        </div>
                      </div>
                    </div>
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
