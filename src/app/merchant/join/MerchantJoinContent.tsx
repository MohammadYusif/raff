// src/app/merchant/join/MerchantJoinContent.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { PageLayout } from "@/shared/components/layouts";
import { Container, Card, CardContent } from "@/shared/components/ui";
import { ArrowForward } from "@/core/i18n";
import { TrendingUp, Zap, Shield, BarChart3, CheckCircle } from "lucide-react";
import { AnimatedButton } from "@/shared/components/AnimatedButton";

/**
 * Merchant Join Content Component
 *
 * Simplified join page with just two OAuth buttons for Salla and Zid.
 * Uses minimal navbar variant for clean, distraction-free experience.
 * Handles OAuth flow initiation for new merchants.
 */
export function MerchantJoinContent() {
  const t = useTranslations("merchantJoin");
  const { data: session } = useSession();
  const [connectingPlatform, setConnectingPlatform] = useState<
    "salla" | "zid" | null
  >(null);

  const handleConnectStore = (platform: "salla" | "zid") => {
    setConnectingPlatform(platform);
    // Redirect to OAuth start endpoint for new merchants
    window.location.href = `/api/${platform}/oauth/join`;
  };

  const isConnecting = connectingPlatform !== null;

  // Check if user is already a merchant
  const isMerchant = session?.user?.role === "MERCHANT";

  return (
    <PageLayout navbarVariant="minimal">
      <div className="min-h-screen from-raff-neutral-50 to-white">
        <Container className="py-12 md:py-20">
          {/* Hero Section */}
          <div className="mb-12 text-center">
            <h1 className="mb-4 text-4xl font-bold text-raff-primary md:text-5xl">
              {t("title")}
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-raff-neutral-600 md:text-xl">
              {t("subtitle")}
            </p>
          </div>

          {/* Main CTA Card */}
          <Card className="mx-auto mb-12 max-w-2xl border-raff-neutral-200 shadow-lg">
            <CardContent className="p-8 md:p-12">
              <div className="mb-8 text-center">
                <h2 className="mb-3 text-2xl font-semibold text-raff-primary md:text-3xl">
                  {t("heading")}
                </h2>
                <p className="text-raff-neutral-600">{t("description")}</p>
              </div>

              {/* OAuth Buttons */}
              <div className="space-y-4">
                {/* Salla Button - Green */}
                <AnimatedButton
                  onClick={() => handleConnectStore("salla")}
                  disabled={isConnecting}
                  unstyled
                  className="group relative w-full overflow-hidden rounded-lg border-2 border-transparent bg-[#00C48C] p-6 text-white shadow-md transition-all hover:scale-[1.02] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/10">
                        <Image
                          src="/images/brands/salla.svg"
                          alt="Salla"
                          width={28}
                          height={28}
                          className="h-7 w-7 brightness-0 invert"
                        />
                      </div>
                      <div className="text-start">
                        <div className="text-xl font-bold">
                          {t("buttons.connectSalla")}
                        </div>
                        <div className="text-sm text-white/80">
                          Salla E-commerce Platform
                        </div>
                      </div>
                    </div>
                    <ArrowForward className="h-6 w-6 transition-transform ltr:group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
                  </div>
                  {connectingPlatform === "salla" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#00C48C]/90">
                      <div className="flex items-center gap-3 text-white">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span className="font-semibold">
                          {t("buttons.connecting")}
                        </span>
                      </div>
                    </div>
                  )}
                </AnimatedButton>

                {/* Zid Button - Purple */}
                <AnimatedButton
                  onClick={() => handleConnectStore("zid")}
                  disabled={isConnecting}
                  unstyled
                  className="group relative w-full overflow-hidden rounded-lg border-2 border-transparent bg-[#8B5CF6] p-6 text-white shadow-md transition-all hover:scale-[1.02] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/10">
                        <Image
                          src="/images/brands/zid.svg"
                          alt="Zid"
                          width={28}
                          height={28}
                          className="h-7 w-7 brightness-0 invert"
                        />
                      </div>
                      <div className="text-start">
                        <div className="text-xl font-bold">
                          {t("buttons.connectZid")}
                        </div>
                        <div className="text-sm text-white/80">
                          Zid E-commerce Platform
                        </div>
                      </div>
                    </div>
                    <ArrowForward className="h-6 w-6 transition-transform ltr:group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
                  </div>
                  {connectingPlatform === "zid" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#8B5CF6]/90">
                      <div className="flex items-center gap-3 text-white">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span className="font-semibold">
                          {t("buttons.connecting")}
                        </span>
                      </div>
                    </div>
                  )}
                </AnimatedButton>
              </div>
            </CardContent>
          </Card>

          {/* Benefits Grid */}
          <div className="mb-12">
            <h3 className="mb-8 text-center text-2xl font-semibold text-raff-primary">
              {t("benefits.title")}
            </h3>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {/* Visibility */}
              <Card className="border-raff-neutral-200">
                <CardContent className="p-6 text-center">
                  <div className="mb-4 flex justify-center">
                    <div className="rounded-full bg-raff-primary/10 p-3">
                      <TrendingUp className="h-6 w-6 text-raff-primary" />
                    </div>
                  </div>
                  <h4 className="mb-2 font-semibold">
                    {t("benefits.visibility.title")}
                  </h4>
                  <p className="text-sm text-raff-neutral-600">
                    {t("benefits.visibility.description")}
                  </p>
                </CardContent>
              </Card>

              {/* Integration */}
              <Card className="border-raff-neutral-200">
                <CardContent className="p-6 text-center">
                  <div className="mb-4 flex justify-center">
                    <div className="rounded-full bg-raff-primary/10 p-3">
                      <Zap className="h-6 w-6 text-raff-primary" />
                    </div>
                  </div>
                  <h4 className="mb-2 font-semibold">
                    {t("benefits.integration.title")}
                  </h4>
                  <p className="text-sm text-raff-neutral-600">
                    {t("benefits.integration.description")}
                  </p>
                </CardContent>
              </Card>

              {/* Control */}
              <Card className="border-raff-neutral-200">
                <CardContent className="p-6 text-center">
                  <div className="mb-4 flex justify-center">
                    <div className="rounded-full bg-raff-primary/10 p-3">
                      <Shield className="h-6 w-6 text-raff-primary" />
                    </div>
                  </div>
                  <h4 className="mb-2 font-semibold">
                    {t("benefits.control.title")}
                  </h4>
                  <p className="text-sm text-raff-neutral-600">
                    {t("benefits.control.description")}
                  </p>
                </CardContent>
              </Card>

              {/* Tracking */}
              <Card className="border-raff-neutral-200">
                <CardContent className="p-6 text-center">
                  <div className="mb-4 flex justify-center">
                    <div className="rounded-full bg-raff-primary/10 p-3">
                      <BarChart3 className="h-6 w-6 text-raff-primary" />
                    </div>
                  </div>
                  <h4 className="mb-2 font-semibold">
                    {t("benefits.tracking.title")}
                  </h4>
                  <p className="text-sm text-raff-neutral-600">
                    {t("benefits.tracking.description")}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* How It Works */}
          <div className="mb-12">
            <h3 className="mb-8 text-center text-2xl font-semibold text-raff-primary">
              {t("howItWorks.title")}
            </h3>
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="border-raff-neutral-200">
                <CardContent className="p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-raff-primary text-2xl font-bold text-white">
                    1
                  </div>
                  <h4 className="mb-2 text-lg font-semibold">
                    {t("howItWorks.step1.title")}
                  </h4>
                  <p className="text-sm text-raff-neutral-600">
                    {t("howItWorks.step1.description")}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-raff-neutral-200">
                <CardContent className="p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-raff-primary text-2xl font-bold text-white">
                    2
                  </div>
                  <h4 className="mb-2 text-lg font-semibold">
                    {t("howItWorks.step2.title")}
                  </h4>
                  <p className="text-sm text-raff-neutral-600">
                    {t("howItWorks.step2.description")}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-raff-neutral-200">
                <CardContent className="p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-raff-primary text-2xl font-bold text-white">
                    3
                  </div>
                  <h4 className="mb-2 text-lg font-semibold">
                    {t("howItWorks.step3.title")}
                  </h4>
                  <p className="text-sm text-raff-neutral-600">
                    {t("howItWorks.step3.description")}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Features List */}
          <Card className="mb-12 border-raff-neutral-200">
            <CardContent className="p-8">
              <h3 className="mb-6 text-center text-2xl font-semibold text-raff-primary">
                {t("features.title")}
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 shrink-0 text-green-500" />
                  <span className="text-raff-neutral-700">
                    {t("features.analytics")}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 shrink-0 text-green-500" />
                  <span className="text-raff-neutral-700">
                    {t("features.customers")}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 shrink-0 text-green-500" />
                  <span className="text-raff-neutral-700">
                    {t("features.commission")}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 shrink-0 text-green-500" />
                  <span className="text-raff-neutral-700">
                    {t("features.support")}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer CTA */}
          <div className="text-center">
            <p className="mb-4 text-raff-neutral-600">
              {t("footer.questions")}
            </p>
            <AnimatedButton
              variant="outline"
              className="mb-6 border-raff-primary text-raff-primary"
            >
              {t("footer.contact")}
            </AnimatedButton>

            {/* Conditional Sign-in / Dashboard Link */}
            {isMerchant ? (
              <div className="text-sm text-raff-neutral-600">
                {t("footer.alreadyMerchant")}{" "}
                <Link
                  href="/merchant/dashboard"
                  className="font-semibold text-raff-primary hover:underline"
                >
                  {t("footer.goToDashboard")}
                </Link>
              </div>
            ) : (
              <div className="text-sm text-raff-neutral-600">
                {t("footer.alreadyMerchant")}{" "}
                <Link
                  href="/auth/login?callbackUrl=/merchant/dashboard"
                  className="font-semibold text-raff-primary hover:underline"
                >
                  {t("footer.signIn")}
                </Link>
              </div>
            )}
          </div>
        </Container>
      </div>
    </PageLayout>
  );
}
