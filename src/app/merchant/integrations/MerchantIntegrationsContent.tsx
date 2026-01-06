// src/app/merchant/integrations/MerchantIntegrationsContent.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
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
  Shield,
  ExternalLink,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { ArrowForward, ChevronBackward } from "@/core/i18n";
import { useMerchantProfile } from "@/lib/hooks/useMerchantApi";
import { AnimatedButton } from "@/shared/components/AnimatedButton";
import { toast } from "sonner";

export function MerchantIntegrationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const t = useTranslations("merchantIntegrations");
  const merchantId = session?.user?.merchantId ?? null;
  const { profile } = useMerchantProfile(Boolean(merchantId));

  const [connectingPlatform, setConnectingPlatform] = useState<
    "salla" | "zid" | null
  >(null);

  // Handle success/registered query params
  useEffect(() => {
    const connected = searchParams.get("connected");
    const registered = searchParams.get("registered");
    const platform = searchParams.get("platform");

    if (connected) {
      const platformLabel =
        connected === "zid"
          ? t("platforms.zid.name")
          : t("platforms.salla.name");
      toast.success(t("toasts.connectedTitle", { platform: platformLabel }), {
        description: t("toasts.connectedDescription"),
      });
      // Clean URL
      router.replace("/merchant/integrations");
    } else if (registered && platform) {
      const platformLabel =
        platform === "zid"
          ? t("platforms.zid.name")
          : t("platforms.salla.name");
      toast.success(t("toasts.registeredTitle"), {
        description: t("toasts.registeredDescription", {
          platform: platformLabel,
        }),
      });
      // Clean URL
      router.replace("/merchant/integrations");
    }
  }, [searchParams, router, t]);

  const isZidConnected = Boolean(
    profile?.zidStoreId ||
      profile?.zidStoreUrl ||
      (profile?.storeInfo.platform === "zid" && profile?.storeInfo.isConnected)
  );
  const isSallaConnected = Boolean(
    profile?.sallaStoreId ||
      profile?.sallaStoreUrl ||
      (profile?.storeInfo.platform === "salla" && profile?.storeInfo.isConnected)
  );

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
                {t("title")}
              </h1>
              <p className="text-raff-neutral-600">{t("subtitle")}</p>
            </div>
            <Link href="/merchant/dashboard">
              <AnimatedButton variant="ghost" className="gap-2">
                <ChevronBackward className="h-4 w-4" />
                {t("backToDashboard")}
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
                    {t("security.title")}
                  </h3>
                  <p className="mb-3 text-raff-neutral-700">
                    {t("security.description", {
                      platforms: `${t("platforms.zid.name")} / ${t("platforms.salla.name")}`,
                    })}
                  </p>
                  <ul className="space-y-1 text-sm text-raff-neutral-600">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-raff-success" />
                      <span>{t("security.items.authenticate")}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-raff-success" />
                      <span>{t("security.items.token")}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-raff-success" />
                      <span>{t("security.items.revoke")}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Available Integrations */}
          <div>
            <h2 className="mb-4 text-xl font-semibold text-raff-primary">
              {t("platforms.title")}
            </h2>
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Salla Integration */}
              <Card className="hover-lift">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#00C48C]/10">
                        <Image
                          src="/images/brands/salla.svg"
                          alt={t("platforms.salla.name")}
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
                          {t("platforms.salla.name")}
                          {isSallaConnected && (
                            <Badge variant="success" className="gap-1">
                              <CheckCircle className="h-3 w-3" />
                              {t("platforms.salla.connected")}
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>
                          {t("platforms.salla.description")}
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
                          {t("platforms.salla.storeUrlLabel")}
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
                        {t("platforms.salla.benefits.sync")}
                      </p>
                      <p className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-raff-success" />
                        {t("platforms.salla.benefits.inventory")}
                      </p>
                      <p className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-raff-success" />
                        {t("platforms.salla.benefits.orders")}
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
                          {t("platforms.salla.button.connecting")}
                        </>
                      ) : isSallaConnected ? (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          {t("platforms.salla.button.reconnect")}
                        </>
                      ) : (
                        <>
                          <Store className="h-4 w-4" />
                          {t("platforms.salla.button.connect")}
                          <ArrowForward className="h-4 w-4" />
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
                          src="/images/brands/zid.svg"
                          alt={t("platforms.zid.name")}
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
                          {t("platforms.zid.name")}
                          {isZidConnected && (
                            <Badge variant="success" className="gap-1">
                              <CheckCircle className="h-3 w-3" />
                              {t("platforms.zid.connected")}
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>
                          {t("platforms.zid.description")}
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
                          {t("platforms.zid.storeUrlLabel")}
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
                        {t("platforms.zid.benefits.sync")}
                      </p>
                      <p className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-raff-success" />
                        {t("platforms.zid.benefits.inventory")}
                      </p>
                      <p className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-raff-success" />
                        {t("platforms.zid.benefits.orders")}
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
                          {t("platforms.zid.button.connecting")}
                        </>
                      ) : isZidConnected ? (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          {t("platforms.zid.button.reconnect")}
                        </>
                      ) : (
                        <>
                          <Store className="h-4 w-4" />
                          {t("platforms.zid.button.connect")}
                          <ArrowForward className="h-4 w-4" />
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
                {t("help.title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-raff-neutral-600">
                <div>
                  <p className="mb-1 font-medium text-raff-primary">
                    {t("help.questions.connect.title")}
                  </p>
                  <p>
                    {t("help.questions.connect.description")}
                  </p>
                </div>
                <div>
                  <p className="mb-1 font-medium text-raff-primary">
                    {t("help.questions.security.title")}
                  </p>
                  <p>
                    {t("help.questions.security.description")}
                  </p>
                </div>
                <div>
                  <p className="mb-1 font-medium text-raff-primary">
                    {t("help.questions.disconnect.title")}
                  </p>
                  <p>
                    {t("help.questions.disconnect.description")}
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
