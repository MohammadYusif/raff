// src/app/merchant/analytics/MerchantAnalyticsContent.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import {
  Container,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui";
import {
  BarChart3,
  TrendingUp,
  Eye,
  MousePointerClick,
  ShoppingCart,
  DollarSign,
  Users,
  Package,
  Calendar,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { toast } from "sonner";

interface AnalyticsData {
  overview: {
    totalViews: number;
    totalClicks: number;
    totalOrders: number;
    totalRevenue: number;
    viewsGrowth: number;
    clicksGrowth: number;
    ordersGrowth: number;
    revenueGrowth: number;
    avgCTR: number;
    avgConversion: number;
  };
  topProducts: Array<{
    id: string;
    name: string;
    nameAr: string;
    views: number;
    clicks: number;
    orders: number;
    revenue: number;
  }>;
  trafficSources: Array<{
    source: string;
    visits: number;
    conversions: number;
    revenue: number;
  }>;
  dailyStats: Array<{
    date: string;
    views: number;
    clicks: number;
    orders: number;
  }>;
}

export function MerchantAnalyticsContent() {
  const { data: session } = useSession();
  const t = useTranslations("merchantAnalytics");
  const locale = useLocale();
  const merchantId = session?.user?.merchantId;

  const localeKey = locale === "ar" ? "ar-SA" : "en-US";
  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(localeKey),
    [localeKey]
  );
  const percentFormatter = useMemo(
    () =>
      new Intl.NumberFormat(localeKey, {
        style: "percent",
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
    [localeKey]
  );
  const formatNumber = (value: number) => numberFormatter.format(value);
  const formatPercent = (value: number) => percentFormatter.format(value / 100);

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d">("30d");

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `/api/merchant/analytics?range=${dateRange}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch analytics");
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error(t("fetchError"));
    } finally {
      setLoading(false);
    }
  }, [dateRange, t]);

  useEffect(() => {
    if (merchantId) {
      fetchAnalytics();
    }
  }, [merchantId, fetchAnalytics]);

  if (loading) {
    return (
      <Container className="py-8">
        <Card>
          <CardContent className="p-12 text-center">
            <RefreshCw className="mx-auto mb-4 h-12 w-12 animate-spin text-raff-primary" />
            <p className="text-raff-neutral-600">{t("loading")}</p>
          </CardContent>
        </Card>
      </Container>
    );
  }

  if (!analytics) {
    return (
      <Container className="py-8">
        <Card>
          <CardContent className="p-12 text-center">
            <BarChart3 className="mx-auto mb-4 h-16 w-16 text-raff-neutral-400" />
            <h3 className="mb-2 text-xl font-semibold text-raff-primary">
              {t("noData")}
            </h3>
            <p className="text-raff-neutral-600">{t("noDataDesc")}</p>
          </CardContent>
        </Card>
      </Container>
    );
  }

  const { overview, topProducts, trafficSources, dailyStats } = analytics;

  return (
    <Container className="py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-raff-primary">
            {t("title")}
          </h1>
          <p className="text-raff-neutral-600">{t("subtitle")}</p>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-raff-neutral-600" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
            className="rounded-lg border border-raff-neutral-300 px-4 py-2 text-sm focus:border-raff-primary focus:outline-none focus:ring-2 focus:ring-raff-primary/20"
          >
            <option value="7d">{t("dateRange.last7Days")}</option>
            <option value="30d">{t("dateRange.last30Days")}</option>
            <option value="90d">{t("dateRange.last90Days")}</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Views */}
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="rounded-lg bg-raff-accent/10 p-2">
                <Eye className="h-5 w-5 text-raff-accent" />
              </div>
              {overview.viewsGrowth !== 0 && (
                <div
                  className={`flex items-center gap-1 text-xs font-medium ${
                    overview.viewsGrowth > 0
                      ? "text-raff-success"
                      : "text-raff-danger"
                  }`}
                >
                  {overview.viewsGrowth > 0 ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {formatPercent(Math.abs(overview.viewsGrowth))}
                </div>
              )}
            </div>
            <p className="mb-1 text-sm text-raff-neutral-600">
              {t("metrics.totalViews")}
            </p>
            <p className="text-2xl font-bold text-raff-primary">
              {formatNumber(overview.totalViews)}
            </p>
          </CardContent>
        </Card>

        {/* Clicks */}
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="rounded-lg bg-raff-primary/10 p-2">
                <MousePointerClick className="h-5 w-5 text-raff-primary" />
              </div>
              {overview.clicksGrowth !== 0 && (
                <div
                  className={`flex items-center gap-1 text-xs font-medium ${
                    overview.clicksGrowth > 0
                      ? "text-raff-success"
                      : "text-raff-danger"
                  }`}
                >
                  {overview.clicksGrowth > 0 ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {formatPercent(Math.abs(overview.clicksGrowth))}
                </div>
              )}
            </div>
            <p className="mb-1 text-sm text-raff-neutral-600">
              {t("metrics.totalClicks")}
            </p>
            <p className="text-2xl font-bold text-raff-primary">
              {formatNumber(overview.totalClicks)}
            </p>
            <p className="text-xs text-raff-neutral-500">
              {formatPercent(overview.avgCTR)} {t("metrics.avgCTR")}
            </p>
          </CardContent>
        </Card>

        {/* Orders */}
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="rounded-lg bg-raff-success/10 p-2">
                <ShoppingCart className="h-5 w-5 text-raff-success" />
              </div>
              {overview.ordersGrowth !== 0 && (
                <div
                  className={`flex items-center gap-1 text-xs font-medium ${
                    overview.ordersGrowth > 0
                      ? "text-raff-success"
                      : "text-raff-danger"
                  }`}
                >
                  {overview.ordersGrowth > 0 ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {formatPercent(Math.abs(overview.ordersGrowth))}
                </div>
              )}
            </div>
            <p className="mb-1 text-sm text-raff-neutral-600">
              {t("metrics.totalOrders")}
            </p>
            <p className="text-2xl font-bold text-raff-primary">
              {formatNumber(overview.totalOrders)}
            </p>
            <p className="text-xs text-raff-neutral-500">
              {formatPercent(overview.avgConversion)} {t("metrics.avgConversion")}
            </p>
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="rounded-lg bg-raff-accent/10 p-2">
                <DollarSign className="h-5 w-5 text-raff-accent" />
              </div>
              {overview.revenueGrowth !== 0 && (
                <div
                  className={`flex items-center gap-1 text-xs font-medium ${
                    overview.revenueGrowth > 0
                      ? "text-raff-success"
                      : "text-raff-danger"
                  }`}
                >
                  {overview.revenueGrowth > 0 ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {formatPercent(Math.abs(overview.revenueGrowth))}
                </div>
              )}
            </div>
            <p className="mb-1 text-sm text-raff-neutral-600">
              {t("metrics.totalRevenue")}
            </p>
            <p className="text-2xl font-bold text-raff-primary">
              {formatPrice(overview.totalRevenue, locale)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {t("topProducts.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <p className="py-8 text-center text-raff-neutral-500">
                {t("topProducts.noData")}
              </p>
            ) : (
              <div className="space-y-3">
                {topProducts.slice(0, 5).map((product, index) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between rounded-lg border border-raff-neutral-200 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-raff-primary/10 text-sm font-bold text-raff-primary">
                        {formatNumber(index + 1)}
                      </div>
                      <div>
                        <p className="font-medium text-raff-primary">
                          {product.nameAr || product.name}
                        </p>
                        <div className="flex gap-3 text-xs text-raff-neutral-600">
                          <span>
                            {formatNumber(product.views)}{" "}
                            {t("topProducts.views")}
                          </span>
                          <span>
                            {formatNumber(product.clicks)}{" "}
                            {t("topProducts.clicks")}
                          </span>
                          <span>
                            {formatNumber(product.orders)}{" "}
                            {t("topProducts.orders")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-end">
                      <p className="font-semibold text-raff-success">
                        {formatPrice(product.revenue, locale)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Traffic Sources */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t("trafficSources.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trafficSources.length === 0 ? (
              <p className="py-8 text-center text-raff-neutral-500">
                {t("trafficSources.noData")}
              </p>
            ) : (
              <div className="space-y-3">
                {trafficSources.map((source) => (
                  <div
                    key={source.source}
                    className="rounded-lg border border-raff-neutral-200 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <p className="font-medium text-raff-primary capitalize">
                        {source.source}
                      </p>
                      <p className="text-sm font-semibold text-raff-success">
                        {formatPrice(source.revenue, locale)}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-raff-neutral-600">
                      <span>
                        {formatNumber(source.visits)}{" "}
                        {t("trafficSources.visits")}
                      </span>
                      <span>
                        {formatNumber(source.conversions)}{" "}
                        {t("trafficSources.conversions")}
                      </span>
                      <span className="text-raff-primary">
                        {source.visits > 0
                          ? formatPercent(
                              (source.conversions / source.visits) * 100
                            )
                          : formatPercent(0)}{" "}
                        {t("trafficSources.conversionRate")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Trend */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t("performanceTrend.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dailyStats.length === 0 ? (
            <p className="py-8 text-center text-raff-neutral-500">
              {t("performanceTrend.noData")}
            </p>
          ) : (
            <div className="space-y-2">
              {dailyStats.slice(0, 10).map((day) => (
                <div
                  key={day.date}
                  className="grid grid-cols-4 gap-4 rounded-lg border border-raff-neutral-200 p-3 text-sm"
                >
                  <div>
                    <p className="text-raff-neutral-600">
                      {t("performanceTrend.date")}
                    </p>
                    <p className="font-medium text-raff-primary">
                      {new Date(day.date).toLocaleDateString(localeKey)}
                    </p>
                  </div>
                  <div>
                    <p className="text-raff-neutral-600">
                      {t("performanceTrend.views")}
                    </p>
                    <p className="font-semibold text-raff-primary">
                      {formatNumber(day.views)}
                    </p>
                  </div>
                  <div>
                    <p className="text-raff-neutral-600">
                      {t("performanceTrend.clicks")}
                    </p>
                    <p className="font-semibold text-raff-primary">
                      {formatNumber(day.clicks)}
                    </p>
                  </div>
                  <div>
                    <p className="text-raff-neutral-600">
                      {t("performanceTrend.orders")}
                    </p>
                    <p className="font-semibold text-raff-success">
                      {formatNumber(day.orders)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
