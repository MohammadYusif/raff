// src/app/auth/register/page.tsx
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { RegisterForm } from "./RegisterForm";
import { Container, Card, CardContent } from "@/shared/components/ui";

export const metadata: Metadata = {
  title: "Register - Raff",
  description: "Create your Raff account",
};

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-raff-neutral-50">
      <Container maxWidth="sm">
        <Card className="border-raff-neutral-200">
          <CardContent className="p-8">
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
                Create Account
              </h1>
              <p className="mt-2 text-sm text-raff-neutral-600">
                Join Raff to save products and track your cart
              </p>
            </div>

            <RegisterForm />

            <div className="mt-6 text-center text-sm text-raff-neutral-600">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="font-semibold text-raff-primary hover:underline"
              >
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </Container>
    </div>
  );
}
