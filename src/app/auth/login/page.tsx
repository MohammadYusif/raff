// src/app/auth/login/page.tsx
import { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "./LoginForm";
import { Container, Card, CardContent } from "@/shared/components/ui";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Login - Raff Merchant",
  description: "Login to your merchant dashboard",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-raff-neutral-50">
      <Container maxWidth="sm">
        <Card className="border-raff-neutral-200">
          <CardContent className="p-8">
            {/* Logo */}
            <div className="mb-8 text-center">
              <Link href="/">
                <Image
                  src="/logo.png"
                  alt="Raff Logo"
                  width={160}
                  height={40}
                  className="mx-auto h-auto w-40 object-contain"
                />
              </Link>
              <h1 className="mt-4 text-2xl font-bold text-raff-primary">
                Merchant Login
              </h1>
              <p className="mt-2 text-sm text-raff-neutral-600">
                Sign in to access your dashboard
              </p>
            </div>

            {/* Login Form */}
            <LoginForm />

            {/* Register Link */}
            <div className="mt-6 text-center text-sm text-raff-neutral-600">
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/register"
                className="font-semibold text-raff-primary hover:underline"
              >
                Register here
              </Link>
            </div>
          </CardContent>
        </Card>
      </Container>
    </div>
  );
}
