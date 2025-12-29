// src/app/merchant/dashboard/MerchantDashboardContent.tsx
"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import {
  Container,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
} from "@/shared/components/ui";
import {
  Store,
  TrendingUp,
  ShoppingBag,
  Eye,
  DollarSign,
  Package,
  Users,
  BarChart3,
  Settings,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  Zap,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface MerchantStats {
  totalProducts: number;
  totalViews: number;
  totalClicks: number;
  totalOrders: number;
  totalRevenue: number;
  conversionRate: number;
  topProducts: Array<{
    id: string;
    title: string;
    views: number;
    orders: number;
  }>;
}

export function MerchantDashboardContent() {
  const t = useTranslations("merchantDashboard");
  const commonT = useTranslations("common");
  const locale = useLocale();

  // Mock merchant data - will be replaced with real API data
  const [isStoreConnected, setIsStoreConnected] = useState(false);
  const [storePlatform, setStorePlatform] = useState<"salla" | "zid" | null>(
    null
  );
  const [isSyncing, setIsSyncing] = useState(false);

  // Mock stats - will be replaced with real API data
  const stats: MerchantStats = {
    totalProducts: 245,
    totalViews: 12450,
    totalClicks: 3890,
    totalOrders: 127,
    totalRevenue: 45670.5,
    conversionRate: 3.27,
    topProducts: [
      { id: "1", title: "Wireless Headphones", views: 1240, orders: 34 },
      { id: "2", title: "Smart Watch", views: 980, orders: 28 },
      { id: "3", title: "Laptop Stand", views: 756, orders: 19 },
    ],
  };

  const handleConnectStore = (platform: "salla" | "zid") => {
    setStorePlatform(platform);
    setIsSyncing(true);
    // TODO: Implement OAuth flow
    setTimeout(() => {
      setIsStoreConnected(true);
      setIsSyncing(false);
    }, 2000);
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
            <Link href="/">
              <Button variant="ghost" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                {t("viewStorefront")}
              </Button>
            </Link>
          </div>
        </Container>
      </div>

      <Container className="py-8">
        <div className="space-y-8">
          {/* Store Connection Status */}
          {!isStoreConnected ? (
            <Card className="border-raff-accent/20 bg-raff-accent/5">
              <CardContent className="p-6">
                <div className="flex flex-col items-center gap-6 text-center md:flex-row md:text-start">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-raff-accent/10">
                    <Store className="h-8 w-8 text-raff-accent" />
                  </div>
                  <div className="flex-1">
                    <h3 className="mb-2 text-xl font-semibold text-raff-primary">
                      {t("connectStore.title")}
                    </h3>
                    <p className="mb-4 text-raff-neutral-600">
                      {t("connectStore.description")}
                    </p>
                    <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                      <Button
                        size="lg"
                        onClick={() => handleConnectStore("salla")}
                        disabled={isSyncing}
                        className="gap-2"
                      >
                        <img
                          src="/salla-icon.png"
                          alt="Salla"
                          className="h-5 w-5"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                        {isSyncing && storePlatform === "salla" ? (
                          <>
                            <Clock className="h-5 w-5 animate-spin" />
                            {t("connectStore.connecting")}
                          </>
                        ) : (
                          <>
                            {t("connectStore.connectSalla")}
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => handleConnectStore("zid")}
                        disabled={isSyncing}
                        className="gap-2"
                      >
                        <img
                          src="/zid-icon.png"
                          alt="Zid"
                          className="h-5 w-5"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                        {isSyncing && storePlatform === "zid" ? (
                          <>
                            <Clock className="h-5 w-5 animate-spin" />
                            {t("connectStore.connecting")}
                          </>
                        ) : (
                          <>
                            {t("connectStore.connectZid")}
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-raff-success/20 bg-raff-success/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 shrink-0 text-raff-success" />
                  <div className="flex-1">
                    <p className="font-semibold text-raff-primary">
                      {t("storeConnected.title")}
                    </p>
                    <p className="text-sm text-raff-neutral-600">
                      {t("storeConnected.description", {
                        platform: storePlatform === "salla" ? "Salla" : "Zid",
                      })}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Settings className="h-4 w-4" />
                    {t("storeConnected.manage")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          {isStoreConnected && (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {/* Total Products */}
                <Card className="hover-lift">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-raff-neutral-600">
                          {t("stats.totalProducts")}
                        </p>
                        <p className="mt-2 text-3xl font-bold text-raff-primary">
                          {stats.totalProducts.toLocaleString(
                            locale === "ar" ? "ar-SA" : "en-US"
                          )}
                        </p>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-raff-primary/10">
                        <Package className="h-6 w-6 text-raff-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Total Views */}
                <Card className="hover-lift">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-raff-neutral-600">
                          {t("stats.totalViews")}
                        </p>
                        <p className="mt-2 text-3xl font-bold text-raff-primary">
                          {stats.totalViews.toLocaleString(
                            locale === "ar" ? "ar-SA" : "en-US"
                          )}
                        </p>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-raff-accent/10">
                        <Eye className="h-6 w-6 text-raff-accent" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Total Orders */}
                <Card className="hover-lift">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-raff-neutral-600">
                          {t("stats.totalOrders")}
                        </p>
                        <p className="mt-2 text-3xl font-bold text-raff-primary">
                          {stats.totalOrders.toLocaleString(
                            locale === "ar" ? "ar-SA" : "en-US"
                          )}
                        </p>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-raff-success/10">
                        <ShoppingBag className="h-6 w-6 text-raff-success" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Total Revenue */}
                <Card className="hover-lift">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-raff-neutral-600">
                          {t("stats.totalRevenue")}
                        </p>
                        <p className="mt-2 text-3xl font-bold text-raff-primary">
                          {formatPrice(stats.totalRevenue, locale)}
                        </p>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-raff-warning/10">
                        <DollarSign className="h-6 w-6 text-raff-warning" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Metrics */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Conversion Rate */}
                <Card className="hover-lift">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-raff-accent" />
                      {t("metrics.conversionRate")}
                    </CardTitle>
                    <CardDescription>
                      {t("metrics.conversionRateDesc")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-raff-primary">
                          {stats.conversionRate}%
                        </span>
                        <Badge variant="success" className="gap-1">
                          <TrendingUp className="h-3 w-3" />
                          +0.5%
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-raff-neutral-600">
                            {t("metrics.clicks")}
                          </span>
                          <span className="font-medium text-raff-primary">
                            {stats.totalClicks.toLocaleString(
                              locale === "ar" ? "ar-SA" : "en-US"
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-raff-neutral-600">
                            {t("metrics.orders")}
                          </span>
                          <span className="font-medium text-raff-primary">
                            {stats.totalOrders.toLocaleString(
                              locale === "ar" ? "ar-SA" : "en-US"
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Top Products */}
                <Card className="hover-lift">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-raff-primary" />
                      {t("topProducts.title")}
                    </CardTitle>
                    <CardDescription>
                      {t("topProducts.description")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {stats.topProducts.map((product, index) => (
                        <div
                          key={product.id}
                          className="flex items-center gap-3 rounded-lg border border-raff-neutral-200 p-3 transition-colors hover:bg-raff-neutral-50"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-raff-primary/10 text-sm font-bold text-raff-primary">
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-raff-primary">
                              {product.title}
                            </p>
                            <div className="flex gap-3 text-xs text-raff-neutral-600">
                              <span>
                                {product.views.toLocaleString(
                                  locale === "ar" ? "ar-SA" : "en-US"
                                )}{" "}
                                {t("topProducts.views")}
                              </span>
                              <span>•</span>
                              <span>
                                {product.orders.toLocaleString(
                                  locale === "ar" ? "ar-SA" : "en-US"
                                )}{" "}
                                {t("topProducts.orders")}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <Card className="hover-lift">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-raff-warning" />
                    {t("quickActions.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Button variant="outline" className="justify-start gap-2">
                      <Package className="h-4 w-4" />
                      {t("quickActions.syncProducts")}
                    </Button>
                    <Button variant="outline" className="justify-start gap-2">
                      <BarChart3 className="h-4 w-4" />
                      {t("quickActions.viewAnalytics")}
                    </Button>
                    <Button variant="outline" className="justify-start gap-2">
                      <Settings className="h-4 w-4" />
                      {t("quickActions.settings")}
                    </Button>
                    <Button variant="outline" className="justify-start gap-2">
                      <ExternalLink className="h-4 w-4" />
                      {t("quickActions.viewStore")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Getting Started Guide (only show when store is connected) */}
          {isStoreConnected && (
            <Card className="border-raff-accent/20 bg-raff-accent/5 hover-lift">
              <CardHeader>
                <CardTitle>{t("gettingStarted.title")}</CardTitle>
                <CardDescription>
                  {t("gettingStarted.description")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="mt-1 h-5 w-5 shrink-0 text-raff-success" />
                    <div>
                      <p className="font-medium text-raff-primary">
                        {t("gettingStarted.step1")}
                      </p>
                      <p className="text-sm text-raff-neutral-600">
                        {t("gettingStarted.step1Desc")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-1 h-5 w-5 shrink-0 text-raff-warning" />
                    <div>
                      <p className="font-medium text-raff-primary">
                        {t("gettingStarted.step2")}
                      </p>
                      <p className="text-sm text-raff-neutral-600">
                        {t("gettingStarted.step2Desc")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="mt-1 h-5 w-5 shrink-0 text-raff-neutral-400" />
                    <div>
                      <p className="font-medium text-raff-primary">
                        {t("gettingStarted.step3")}
                      </p>
                      <p className="text-sm text-raff-neutral-600">
                        {t("gettingStarted.step3Desc")}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </Container>
    </div>
  );
}
