"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Store,
  Package,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Eye,
  MousePointerClick,
  Home,
} from "lucide-react";

interface AdminAnalytics {
  overview: {
    totalMerchants: number;
    activeMerchants: number;
    pendingMerchants: number;
    merchantsGrowth: number;
    totalProducts: number;
    activeProducts: number;
    productsGrowth: number;
    totalUsers: number;
    totalOrders: number;
    ordersGrowth: number;
    totalRevenue: number;
    revenueGrowth: number;
    totalClicks: number;
    clicksGrowth: number;
    totalViews: number;
    viewsGrowth: number;
    avgCTR: number;
    avgConversion: number;
    currency: string;
  };
  platformDistribution: {
    salla: number;
    zid: number;
    total: number;
  };
  clickQuality: {
    qualifiedClicks: number;
    totalClickEvents: number;
    qualityRate: number;
    disqualifiedReasons: Array<{ reason: string; count: number }>;
  };
  topMerchants: Array<{
    id: string;
    name: string;
    email: string;
    products: number;
    clicks: number;
    orders: number;
    revenue: number;
  }>;
  dailyStats: Array<{
    date: string;
    merchants: number;
    users: number;
    products: number;
    orders: number;
    revenue: number;
    clicks: number;
    views: number;
  }>;
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
}

export function AdminDashboardContent() {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d");

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/analytics?range=${range}`);
        if (response.ok) {
          const data = await response.json();
          setAnalytics(data);
        }
      } catch (error) {
        console.error("Failed to fetch admin analytics:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [range]);

  if (loading || !analytics) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading analytics...</div>
      </div>
    );
  }

  const { overview, platformDistribution, clickQuality, topMerchants } = analytics;

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US").format(num);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: overview.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (num: number) => {
    return `${num >= 0 ? "+" : ""}${num.toFixed(1)}%`;
  };

  const StatCard = ({
    title,
    value,
    growth,
    icon: Icon,
    color,
  }: {
    title: string;
    value: string | number;
    growth?: number;
    icon: typeof Users;
    color: string;
  }) => (
    <div className="rounded-lg border border-raff-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-raff-neutral-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-raff-neutral-900">{value}</p>
          {growth !== undefined && (
            <p
              className={`mt-2 text-sm font-medium ${
                growth >= 0 ? "text-raff-success" : "text-raff-error"
              }`}
            >
              {formatPercent(growth)} from last period
            </p>
          )}
        </div>
        <div className={`rounded-full p-3 ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-raff-neutral-50 p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-raff-neutral-900">Admin Dashboard</h1>
            <p className="mt-2 text-raff-neutral-600">
              Real-time platform analytics and insights
            </p>
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-raff-neutral-700 shadow-sm transition-colors hover:bg-raff-neutral-100"
          >
            <Home className="h-4 w-4" />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Time Range Selector */}
        <div className="mb-6 flex gap-2">
          {(["7d", "30d", "90d"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                range === r
                  ? "bg-raff-primary text-white"
                  : "bg-white text-raff-neutral-700 hover:bg-raff-neutral-100"
              }`}
            >
              Last {r === "7d" ? "7" : r === "30d" ? "30" : "90"} days
            </button>
          ))}
        </div>

        {/* Overview Stats */}
        <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Merchants"
            value={formatNumber(overview.totalMerchants)}
            growth={overview.merchantsGrowth}
            icon={Store}
            color="bg-blue-500"
          />
          <StatCard
            title="Active Merchants"
            value={formatNumber(overview.activeMerchants)}
            icon={Store}
            color="bg-green-500"
          />
          <StatCard
            title="Total Products"
            value={formatNumber(overview.totalProducts)}
            growth={overview.productsGrowth}
            icon={Package}
            color="bg-purple-500"
          />
          <StatCard
            title="Total Users"
            value={formatNumber(overview.totalUsers)}
            icon={Users}
            color="bg-indigo-500"
          />
        </div>

        {/* Revenue & Performance */}
        <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Revenue"
            value={formatCurrency(overview.totalRevenue)}
            growth={overview.revenueGrowth}
            icon={DollarSign}
            color="bg-raff-primary"
          />
          <StatCard
            title="Total Orders"
            value={formatNumber(overview.totalOrders)}
            growth={overview.ordersGrowth}
            icon={ShoppingCart}
            color="bg-orange-500"
          />
          <StatCard
            title="Total Views"
            value={formatNumber(overview.totalViews)}
            growth={overview.viewsGrowth}
            icon={Eye}
            color="bg-cyan-500"
          />
          <StatCard
            title="Total Clicks"
            value={formatNumber(overview.totalClicks)}
            growth={overview.clicksGrowth}
            icon={MousePointerClick}
            color="bg-pink-500"
          />
        </div>

        {/* Conversion Metrics */}
        <div className="mb-8 grid gap-6 sm:grid-cols-2">
          <div className="rounded-lg border border-raff-neutral-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-raff-neutral-900">
              Click-Through Rate (CTR)
            </h3>
            <p className="mt-2 text-4xl font-bold text-raff-primary">
              {overview.avgCTR.toFixed(2)}%
            </p>
            <p className="mt-2 text-sm text-raff-neutral-600">
              {formatNumber(overview.totalClicks)} clicks from {formatNumber(overview.totalViews)}{" "}
              views
            </p>
          </div>
          <div className="rounded-lg border border-raff-neutral-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-raff-neutral-900">
              Conversion Rate
            </h3>
            <p className="mt-2 text-4xl font-bold text-raff-success">
              {overview.avgConversion.toFixed(2)}%
            </p>
            <p className="mt-2 text-sm text-raff-neutral-600">
              {formatNumber(overview.totalOrders)} orders from {formatNumber(overview.totalClicks)}{" "}
              clicks
            </p>
          </div>
        </div>

        {/* Platform Distribution & Click Quality */}
        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          {/* Platform Distribution */}
          <div className="rounded-lg border border-raff-neutral-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-raff-neutral-900">
              Platform Distribution
            </h3>
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex justify-between">
                  <span className="text-sm font-medium text-raff-neutral-700">Salla</span>
                  <span className="text-sm font-bold text-raff-neutral-900">
                    {platformDistribution.salla}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-raff-neutral-200">
                  <div
                    className="h-full bg-raff-salla"
                    style={{
                      width: `${(platformDistribution.salla / platformDistribution.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="mb-2 flex justify-between">
                  <span className="text-sm font-medium text-raff-neutral-700">Zid</span>
                  <span className="text-sm font-bold text-raff-neutral-900">
                    {platformDistribution.zid}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-raff-neutral-200">
                  <div
                    className="h-full bg-raff-zid"
                    style={{
                      width: `${(platformDistribution.zid / platformDistribution.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Click Quality */}
          <div className="rounded-lg border border-raff-neutral-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-raff-neutral-900">
              Click Quality & Fraud Prevention
            </h3>
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-raff-neutral-700">Quality Rate</span>
                <span className="text-2xl font-bold text-raff-success">
                  {clickQuality.qualityRate.toFixed(1)}%
                </span>
              </div>
              <div className="mt-2 text-sm text-raff-neutral-600">
                {formatNumber(clickQuality.qualifiedClicks)} qualified out of{" "}
                {formatNumber(clickQuality.totalClickEvents)} total events
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-raff-neutral-500">
                Disqualified Reasons
              </p>
              {clickQuality.disqualifiedReasons.map((reason) => (
                <div key={reason.reason} className="flex items-center justify-between text-sm">
                  <span className="text-raff-neutral-700">{reason.reason}</span>
                  <span className="font-medium text-raff-neutral-900">{reason.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Merchants */}
        <div className="mb-8 rounded-lg border border-raff-neutral-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-raff-neutral-900">
            Top Merchants by Revenue
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-raff-neutral-200 text-left text-sm font-medium text-raff-neutral-600">
                  <th className="pb-3">Merchant</th>
                  <th className="pb-3">Email</th>
                  <th className="pb-3 text-right">Products</th>
                  <th className="pb-3 text-right">Clicks</th>
                  <th className="pb-3 text-right">Orders</th>
                  <th className="pb-3 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-raff-neutral-200">
                {topMerchants.map((merchant) => (
                  <tr key={merchant.id} className="text-sm">
                    <td className="py-3 font-medium text-raff-neutral-900">{merchant.name}</td>
                    <td className="py-3 text-raff-neutral-600">{merchant.email}</td>
                    <td className="py-3 text-right text-raff-neutral-900">
                      {formatNumber(merchant.products)}
                    </td>
                    <td className="py-3 text-right text-raff-neutral-900">
                      {formatNumber(merchant.clicks)}
                    </td>
                    <td className="py-3 text-right text-raff-neutral-900">
                      {formatNumber(merchant.orders)}
                    </td>
                    <td className="py-3 text-right font-semibold text-raff-primary">
                      {formatCurrency(merchant.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Merchants Alert */}
        {overview.pendingMerchants > 0 && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-yellow-600" />
              <p className="font-medium text-yellow-900">
                {overview.pendingMerchants} merchant(s) pending approval
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
