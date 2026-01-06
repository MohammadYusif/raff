// src/app/merchant/complete-registration/CompleteRegistrationContent.tsx
"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Container,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/shared/components/ui";
import {
  CheckCircle,
  Mail,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  Store,
} from "lucide-react";
import { AnimatedButton } from "@/shared/components/AnimatedButton";
import { toast } from "sonner";

const completeRegistrationSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type CompleteRegistrationForm = z.infer<typeof completeRegistrationSchema>;

export function CompleteRegistrationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenValid, setTokenValid] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompleteRegistrationForm>({
    resolver: zodResolver(completeRegistrationSchema),
  });

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      toast.error("Invalid registration link");
    }
  }, [token]);

  const onSubmit = async (data: CompleteRegistrationForm) => {
    if (!token) {
      toast.error("Invalid registration token");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/merchant/complete-registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          email: data.email,
          password: data.password,
          name: data.name,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Registration failed");
      }

      toast.success("Registration completed successfully!", {
        description: "You can now log in with your credentials.",
      });

      // Redirect to login page
      setTimeout(() => {
        router.push("/auth/login");
      }, 1500);
    } catch (error) {
      console.error("Registration error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to complete registration"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-raff-neutral-50 flex items-center justify-center">
        <Container className="py-12">
          <Card className="mx-auto max-w-md border-raff-danger/20 bg-raff-danger/5">
            <CardContent className="p-8 text-center">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-raff-danger/10 p-3">
                  <AlertCircle className="h-8 w-8 text-raff-danger" />
                </div>
              </div>
              <h2 className="mb-2 text-xl font-semibold text-raff-primary">
                Invalid Registration Link
              </h2>
              <p className="mb-6 text-raff-neutral-600">
                This registration link is invalid or has expired.
              </p>
              <AnimatedButton
                onClick={() => router.push("/merchant/join")}
                className="w-full"
              >
                Start Over
              </AnimatedButton>
            </CardContent>
          </Card>
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-raff-neutral-50">
      {/* Header */}
      <div className="border-b border-raff-neutral-200 bg-white">
        <Container className="py-6">
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-raff-accent/10 p-3">
                <Store className="h-8 w-8 text-raff-accent" />
              </div>
            </div>
            <h1 className="mb-2 text-3xl font-bold text-raff-primary">
              Complete Your Registration
            </h1>
            <p className="text-raff-neutral-600">
              You&apos;re almost there! Just set up your Raff account credentials.
            </p>
          </div>
        </Container>
      </div>

      <Container className="py-12">
        <div className="mx-auto max-w-lg space-y-8">
          {/* Success Steps */}
          <Card className="border-raff-success/20 bg-raff-success/5">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-raff-success" />
                  <div>
                    <p className="font-medium text-raff-primary">
                      Store Connected
                    </p>
                    <p className="text-sm text-raff-neutral-600">
                      Your store has been successfully connected to Raff
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-raff-success" />
                  <div>
                    <p className="font-medium text-raff-primary">
                      Products Syncing
                    </p>
                    <p className="text-sm text-raff-neutral-600">
                      Your products will be available on Raff shortly
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Registration Form */}
          <Card>
            <CardHeader>
              <CardTitle>Set Your Account Credentials</CardTitle>
              <CardDescription>
                Create your Raff login credentials to access your merchant dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Name (Optional) */}
                <div>
                  <label
                    htmlFor="name"
                    className="mb-2 block text-sm font-medium text-raff-primary"
                  >
                    Your Name (Optional)
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-raff-neutral-400" />
                    <input
                      {...register("name")}
                      type="text"
                      id="name"
                      className="w-full rounded-lg border border-raff-neutral-300 py-2 pl-10 pr-4 focus:border-raff-primary focus:outline-none focus:ring-2 focus:ring-raff-primary/20"
                      placeholder="Your full name"
                    />
                  </div>
                  {errors.name && (
                    <p className="mt-1 text-sm text-raff-danger">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-raff-primary"
                  >
                    Email Address <span className="text-raff-danger">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-raff-neutral-400" />
                    <input
                      {...register("email")}
                      type="email"
                      id="email"
                      required
                      className="w-full rounded-lg border border-raff-neutral-300 py-2 pl-10 pr-4 focus:border-raff-primary focus:outline-none focus:ring-2 focus:ring-raff-primary/20"
                      placeholder="your@email.com"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-sm text-raff-danger">
                      {errors.email.message}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-raff-neutral-500">
                    Use an email you have access to for account recovery
                  </p>
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-medium text-raff-primary"
                  >
                    Password <span className="text-raff-danger">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-raff-neutral-400" />
                    <input
                      {...register("password")}
                      type="password"
                      id="password"
                      required
                      className="w-full rounded-lg border border-raff-neutral-300 py-2 pl-10 pr-4 focus:border-raff-primary focus:outline-none focus:ring-2 focus:ring-raff-primary/20"
                      placeholder="Create a strong password"
                    />
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-raff-danger">
                      {errors.password.message}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-raff-neutral-500">
                    At least 8 characters with uppercase, lowercase, and numbers
                  </p>
                </div>

                {/* Confirm Password */}
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-2 block text-sm font-medium text-raff-primary"
                  >
                    Confirm Password <span className="text-raff-danger">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-raff-neutral-400" />
                    <input
                      {...register("confirmPassword")}
                      type="password"
                      id="confirmPassword"
                      required
                      className="w-full rounded-lg border border-raff-neutral-300 py-2 pl-10 pr-4 focus:border-raff-primary focus:outline-none focus:ring-2 focus:ring-raff-primary/20"
                      placeholder="Confirm your password"
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-raff-danger">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <AnimatedButton
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full gap-2"
                  size="lg"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Completing Registration...
                    </>
                  ) : (
                    <>
                      Complete Registration
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </AnimatedButton>
              </form>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="border-raff-neutral-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-raff-accent" />
                <div className="text-sm text-raff-neutral-600">
                  <p className="mb-1 font-medium text-raff-primary">
                    Why do I need this?
                  </p>
                  <p>
                    Your Raff account is separate from your store platform. These
                    credentials let you log in to manage your products, view
                    analytics, and control your Raff presence.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Container>
    </div>
  );
}
