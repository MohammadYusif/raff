// src/app/cart/error.tsx
"use client";

import Link from "next/link";
import { PageLayout } from "@/shared/components/layouts";
import { Container, Card, CardContent, Button } from "@/shared/components/ui";
import { AlertCircle, ShoppingCart } from "lucide-react";

export default function CartError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageLayout>
      <div className="min-h-screen bg-raff-neutral-50">
        {/* Header */}
        <div className="border-b border-raff-neutral-200 bg-white">
          <Container className="py-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-raff-neutral-100">
                <ShoppingCart className="h-6 w-6 text-raff-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-raff-primary">Cart</h1>
              </div>
            </div>
          </Container>
        </div>

        <Container className="py-16">
          <Card className="mx-auto max-w-md">
            <CardContent className="p-8 text-center">
              {/* Error Icon */}
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>

              {/* Error Message */}
              <h2 className="mb-2 text-xl font-bold text-raff-primary">
                Failed to Load Cart
              </h2>
              <p className="mb-6 text-sm text-raff-neutral-600">
                We encountered an error while loading your cart. This might be a
                temporary issue.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <Button onClick={reset} className="w-full">
                  Try Again
                </Button>
                <Link href="/products" className="w-full">
                  <Button variant="outline" className="w-full">
                    Continue Shopping
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </Container>
      </div>
    </PageLayout>
  );
}
