// src/app/merchant/integrations/MerchantIntegrationsContent.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Container,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
} from "@/shared/components/ui";
import {
  Store,
  CheckCircle,
  Clock,
  ArrowRight,
  Shield,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { useMerchantProfile } from "@/lib/hooks/useMerchantApi";
import { AnimatedButton } from "@/shared/components/AnimatedButton";
import { toast } from "sonner";

export function MerchantIntegrationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const merchantId = session?.user?.merchantId ?? null;
  const { profile, loading } = useMerchantProfile(Boolean(merchantId));

  const [connectingPlatform, setConnectingPlatform] = useState<
    "salla" | "zid" | null
  >(null);

  // Handle success/registered query params
  useEffect(() => {
    const connected = searchParams.get("connected");
    const registered = searchParams.get("registered");
    const platform = searchParams.get("platform");

    if (connected) {
      toast.success(
        `Successfully connected to ${connected === "zid" ? "Zid" : "Salla"}!`,
        {
          description: "Your store is now synced with Raff.",
        }
      );
      // Clean URL
      router.replace("/merchant/integrations");
    } else if (registered && platform) {
      toast.success(`Welcome to Raff!`, {
        description: `Your ${platform === "zid" ? "Zid" : "Salla"} store has been connected. Your account is pending approval.`,
      });
      // Clean URL
      router.replace("/merchant/integrations");
    }
  }, [searchParams, router]);

  const isZidConnected = Boolean(profile?.zidStoreId);
  const isSallaConnected = Boolean(profile?.sallaStoreId);

  const handleConnectStore = (platform: "salla" | "zid") => {
    if (!merchantId) return;
    setConnectingPlatform(platform);
    window.location.href = `/api/${platform}/oauth/start`;
  };

  return (
    <div className="min-h-screen bg-raff-neutral-50">
      {/* Header */}
      <div className="border-b border-raff-neutral-200 bg-white">
        <Container className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="mb-2 text-3xl font-bold text-raff-primary">
                Store Integrations
              </h1>
              <p className="text-raff-neutral-600">
                Connect your e-commerce store to sync products with Raff
              </p>
            </div>
            <Link href="/merchant/dashboard">
              <AnimatedButton variant="ghost" className="gap-2">
                <ChevronRight className="h-4 w-4 rotate-180" />
                Back to Dashboard
              </AnimatedButton>
            </Link>
          </div>
        </Container>
      </div>

      <Container className="py-8">
        <div className="space-y-8">
          {/* Security Notice */}
          <Card className="border-raff-primary/20 bg-raff-primary/5">
            <CardContent className="p-6">
              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-raff-primary/10">
                  <Shield className="h-6 w-6 text-raff-primary" />
                </div>
                <div>
                  <h3 className="mb-2 text-lg font-semibold text-raff-primary">
                    Secure OAuth Connection
                  </h3>
                  <p className="mb-3 text-raff-neutral-700">
                    When you connect your store, you&apos;ll be redirected to{" "}
                    <strong>Zid</strong> or <strong>Salla</strong> to authorize
                    Raff. We <strong>never see or store your store password</strong>.
                  </p>
                  <ul className="space-y-1 text-sm text-raff-neutral-600">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-raff-success" />
                      <span>
                        You authenticate directly on the platform&apos;s website
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-raff-success" />
                      <span>Raff only receives a secure access token</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-raff-success" />
                      <span>You can revoke access anytime from your store settings</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Available Integrations */}
          <div>
            <h2 className="mb-4 text-xl font-semibold text-raff-primary">
              Available Platforms
            </h2>
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Salla Integration */}
              <Card className="hover-lift">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#00C48C]/10">
                        <Image
                          src="/salla-icon.png"
                          alt="Salla"
                          width={32}
                          height={32}
                          className="h-8 w-8"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          Salla
                          {isSallaConnected && (
                            <Badge variant="success" className="gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Connected
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>
                          Saudi Arabia&apos;s leading e-commerce platform
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {isSallaConnected && profile?.sallaStoreUrl && (
                      <div className="rounded-lg border border-raff-neutral-200 bg-raff-neutral-50 p-3">
                        <p className="mb-1 text-xs font-medium text-raff-neutral-600">
                          Store URL
                        </p>
                        <a
                          href={profile.sallaStoreUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm font-medium text-raff-primary hover:underline"
                        >
                          {profile.sallaStoreUrl}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                    <div className="space-y-2 text-sm text-raff-neutral-600">
                      <p className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-raff-success" />
                        Automatic product syncing
                      </p>
                      <p className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-raff-success" />
                        Real-time inventory updates
                      </p>
                      <p className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-raff-success" />
                        Order tracking and analytics
                      </p>
                    </div>
                    <AnimatedButton
                      className="w-full gap-2"
                      onClick={() => handleConnectStore("salla")}
                      disabled={!!connectingPlatform || isSallaConnected}
                      variant={isSallaConnected ? "outline" : "default"}
                    >
                      {connectingPlatform === "salla" ? (
                        <>
                          <Clock className="h-5 w-5 animate-spin" />
                          Connecting...
                        </>
                      ) : isSallaConnected ? (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          Reconnect Salla
                        </>
                      ) : (
                        <>
                          <Store className="h-4 w-4" />
                          Connect Salla Store
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </AnimatedButton>
                  </div>
                </CardContent>
              </Card>

              {/* Zid Integration */}
              <Card className="hover-lift">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-raff-accent/10">
                        <Image
                          src="/zid-icon.png"
                          alt="Zid"
                          width={32}
                          height={32}
                          className="h-8 w-8"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          Zid
                          {isZidConnected && (
                            <Badge variant="success" className="gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Connected
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>
                          Build and grow your online store
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {isZidConnected && profile?.zidStoreUrl && (
                      <div className="rounded-lg border border-raff-neutral-200 bg-raff-neutral-50 p-3">
                        <p className="mb-1 text-xs font-medium text-raff-neutral-600">
                          Store URL
                        </p>
                        <a
                          href={profile.zidStoreUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm font-medium text-raff-primary hover:underline"
                        >
                          {profile.zidStoreUrl}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                    <div className="space-y-2 text-sm text-raff-neutral-600">
                      <p className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-raff-success" />
                        Automatic product syncing
                      </p>
                      <p className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-raff-success" />
                        Real-time inventory updates
                      </p>
                      <p className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-raff-success" />
                        Order tracking and analytics
                      </p>
                    </div>
                    <AnimatedButton
                      className="w-full gap-2"
                      onClick={() => handleConnectStore("zid")}
                      disabled={!!connectingPlatform || isZidConnected}
                      variant={isZidConnected ? "outline" : "default"}
                    >
                      {connectingPlatform === "zid" ? (
                        <>
                          <Clock className="h-5 w-5 animate-spin" />
                          Connecting...
                        </>
                      ) : isZidConnected ? (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          Reconnect Zid
                        </>
                      ) : (
                        <>
                          <Store className="h-4 w-4" />
                          Connect Zid Store
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </AnimatedButton>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Help Section */}
          <Card className="border-raff-neutral-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-raff-accent" />
                Need Help?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-raff-neutral-600">
                <div>
                  <p className="mb-1 font-medium text-raff-primary">
                    How do I connect my store?
                  </p>
                  <p>
                    Click the &quot;Connect&quot; button above. You&apos;ll be
                    redirected to your platform&apos;s website to authorize the
                    connection. After authorization, you&apos;ll be redirected
                    back to Raff.
                  </p>
                </div>
                <div>
                  <p className="mb-1 font-medium text-raff-primary">
                    Is my data secure?
                  </p>
                  <p>
                    Yes. We use OAuth 2.0, the industry standard for secure
                    authorization. We never see or store your store password.
                    Only product and order data is synced.
                  </p>
                </div>
                <div>
                  <p className="mb-1 font-medium text-raff-primary">
                    Can I disconnect my store?
                  </p>
                  <p>
                    Yes. You can revoke access at any time from your store&apos;s
                    settings or by contacting Raff support.
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
