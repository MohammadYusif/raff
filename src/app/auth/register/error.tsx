// src/app/auth/register/error.tsx
"use client";

import Link from "next/link";
import { Container, Card, CardContent } from "@/shared/components/ui";
import { AlertCircle } from "lucide-react";
import { AnimatedButton } from "@/shared/components/AnimatedButton";

/**
 * Error boundary for register page
 * Auth pages intentionally don't use PageLayout to provide
 * a focused, distraction-free authentication experience.
 */
export default function RegisterError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  void error;
  return (
    <div className="flex min-h-screen items-center justify-center bg-raff-neutral-50">
      <Container maxWidth="sm">
        {/* Back to Home Button */}
        <div className="mb-4">
          <Link href="/">
            <AnimatedButton variant="ghost">Back to Home</AnimatedButton>
          </Link>
        </div>

        <Card className="border-raff-neutral-200">
          <CardContent className="p-8 text-center">
            {/* Error Icon */}
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>

            {/* Error Message */}
            <h2 className="mb-2 text-xl font-bold text-raff-primary">
              Something Went Wrong
            </h2>
            <p className="mb-6 text-sm text-raff-neutral-600">
              We encountered an error while loading the registration page.
              Please try again.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <AnimatedButton onClick={reset} className="w-full">
                Try Again
              </AnimatedButton>
              <Link href="/" className="w-full">
                <AnimatedButton variant="outline" className="w-full">
                  Return to Home
                </AnimatedButton>
              </Link>
            </div>
          </CardContent>
        </Card>
      </Container>
    </div>
  );
}