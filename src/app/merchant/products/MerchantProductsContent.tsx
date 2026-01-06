// src/app/merchant/products/MerchantProductsContent.tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import {
  Container,
  Card,
  CardContent,
  Badge,
  Input,
  AnimatedButton,
} from "@/shared/components/ui";
import {
  Package,
  RefreshCw,
  Eye,
  MousePointerClick,
  ShoppingCart,
  TrendingUp,
  Search,
  Filter,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useMerchantSync } from "@/lib/hooks/useMerchantApi";
import { formatPrice } from "@/lib/utils";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  image: string | null;
  isActive: boolean;
  views: number;
  clicks: number;
  orders: number;
  revenue: number;
  conversionRate: number;
  lastViewedAt: Date | null;
  createdAt: Date;
}

export function MerchantProductsContent() {
  const { data: session } = useSession();
  const t = useTranslations("merchantProducts");
  const merchantId = session?.user?.merchantId;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [sortBy, setSortBy] = useState<
    "views" | "clicks" | "orders" | "revenue"
  >("views");

  const { triggerSync, syncing } = useMerchantSync(Boolean(merchantId));

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch("/api/merchant/products");
      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }

      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error(t("fetchError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (merchantId) {
      fetchProducts();
    }
  }, [merchantId, fetchProducts]);

  const handleSync = async () => {
    const result = await triggerSync();
    if (result?.success) {
      toast.success(t("syncSuccess"));
      await fetchProducts();
      return;
    }
    toast.error(result?.error || t("syncError"));
  };

  const filteredProducts = products
    .filter((product) => {
      // Filter by status
      if (filterStatus === "active" && !product.isActive) return false;
      if (filterStatus === "inactive" && product.isActive) return false;

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          product.name.toLowerCase().includes(query) ||
          product.nameAr.toLowerCase().includes(query)
        );
      }

      return true;
    })
    .sort((a, b) => {
      // Sort by selected metric
      return b[sortBy] - a[sortBy];
    });

  const stats = {
    total: products.length,
    active: products.filter((p) => p.isActive).length,
    inactive: products.filter((p) => !p.isActive).length,
    totalViews: products.reduce((sum, p) => sum + p.views, 0),
    totalClicks: products.reduce((sum, p) => sum + p.clicks, 0),
    totalOrders: products.reduce((sum, p) => sum + p.orders, 0),
    totalRevenue: products.reduce((sum, p) => sum + p.revenue, 0),
  };

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
        <AnimatedButton
          onClick={handleSync}
          disabled={syncing || loading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? t("syncing") : t("syncNow")}
        </AnimatedButton>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-raff-neutral-600">
                  {t("stats.totalProducts")}
                </p>
                <p className="text-2xl font-bold text-raff-primary">
                  {stats.total}
                </p>
                <p className="text-xs text-raff-neutral-500">
                  {stats.active} {t("stats.active")} • {stats.inactive}{" "}
                  {t("stats.inactive")}
                </p>
              </div>
              <Package className="h-10 w-10 text-raff-primary/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-raff-neutral-600">
                  {t("stats.totalViews")}
                </p>
                <p className="text-2xl font-bold text-raff-primary">
                  {stats.totalViews.toLocaleString()}
                </p>
                <p className="text-xs text-raff-success">
                  <TrendingUp className="inline h-3 w-3" />{" "}
                  {t("stats.viewsGrowth")}
                </p>
              </div>
              <Eye className="h-10 w-10 text-raff-accent/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-raff-neutral-600">
                  {t("stats.totalClicks")}
                </p>
                <p className="text-2xl font-bold text-raff-primary">
                  {stats.totalClicks.toLocaleString()}
                </p>
                <p className="text-xs text-raff-neutral-500">
                  {stats.totalViews > 0
                    ? `${((stats.totalClicks / stats.totalViews) * 100).toFixed(1)}% CTR`
                    : "0% CTR"}
                </p>
              </div>
              <MousePointerClick className="h-10 w-10 text-raff-accent/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-raff-neutral-600">
                  {t("stats.totalOrders")}
                </p>
                <p className="text-2xl font-bold text-raff-primary">
                  {stats.totalOrders.toLocaleString()}
                </p>
                <p className="text-xs text-raff-neutral-500">
                  {formatPrice(stats.totalRevenue)} {t("stats.revenue")}
                </p>
              </div>
              <ShoppingCart className="h-10 w-10 text-raff-success/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Search */}
            <div className="relative flex-1 lg:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-raff-neutral-400 z-10" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-raff-neutral-600" />
                <select
                  value={filterStatus}
                  onChange={(e) =>
                    setFilterStatus(e.target.value as typeof filterStatus)
                  }
                  className="rounded-lg border border-raff-neutral-300 px-3 py-2 text-sm focus:border-raff-primary focus:outline-none focus:ring-2 focus:ring-raff-primary/20"
                >
                  <option value="all">{t("filters.all")}</option>
                  <option value="active">{t("filters.active")}</option>
                  <option value="inactive">{t("filters.inactive")}</option>
                </select>
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="rounded-lg border border-raff-neutral-300 px-3 py-2 text-sm focus:border-raff-primary focus:outline-none focus:ring-2 focus:ring-raff-primary/20"
              >
                <option value="views">{t("sortBy.views")}</option>
                <option value="clicks">{t("sortBy.clicks")}</option>
                <option value="orders">{t("sortBy.orders")}</option>
                <option value="revenue">{t("sortBy.revenue")}</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      {loading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <RefreshCw className="mx-auto mb-4 h-12 w-12 animate-spin text-raff-primary" />
            <p className="text-raff-neutral-600">{t("loading")}</p>
          </CardContent>
        </Card>
      ) : filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="mx-auto mb-4 h-16 w-16 text-raff-neutral-400" />
            <h3 className="mb-2 text-xl font-semibold text-raff-primary">
              {products.length === 0 ? t("noProducts") : t("noResults")}
            </h3>
            <p className="mb-6 text-raff-neutral-600">
              {products.length === 0 ? t("noProductsDesc") : t("noResultsDesc")}
            </p>
            {products.length === 0 && (
              <AnimatedButton onClick={handleSync} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                {t("syncNow")}
              </AnimatedButton>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                  {/* Product Image & Info */}
                  <div className="flex flex-1 items-center gap-4">
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.name}
                        width={80}
                        height={80}
                        className="h-20 w-20 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-raff-neutral-100">
                        <Package className="h-8 w-8 text-raff-neutral-400" />
                      </div>
                    )}

                    <div className="flex-1">
                      <div className="mb-1 flex items-start gap-2">
                        <h3 className="font-semibold text-raff-primary">
                          {product.nameAr || product.name}
                        </h3>
                        {product.isActive ? (
                          <Badge variant="success" className="gap-1 text-xs">
                            <CheckCircle className="h-3 w-3" />
                            {t("status.active")}
                          </Badge>
                        ) : (
                          <Badge variant="error" className="gap-1 text-xs">
                            <XCircle className="h-3 w-3" />
                            {t("status.inactive")}
                          </Badge>
                        )}
                      </div>
                      <p className="mb-2 text-lg font-bold text-raff-primary">
                        {formatPrice(product.price)}
                      </p>
                      <div className="flex flex-wrap gap-3 text-xs text-raff-neutral-600">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {product.views.toLocaleString()} {t("metrics.views")}
                        </span>
                        <span className="flex items-center gap-1">
                          <MousePointerClick className="h-3 w-3" />
                          {product.clicks.toLocaleString()}{" "}
                          {t("metrics.clicks")}
                        </span>
                        <span className="flex items-center gap-1">
                          <ShoppingCart className="h-3 w-3" />
                          {product.orders.toLocaleString()}{" "}
                          {t("metrics.orders")}
                        </span>
                        {product.orders > 0 && (
                          <span className="flex items-center gap-1 text-raff-success">
                            <TrendingUp className="h-3 w-3" />
                            {formatPrice(product.revenue)}{" "}
                            {t("metrics.revenue")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="flex gap-3 border-t border-raff-neutral-200 pt-4 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                    <div className="text-center">
                      <p className="text-xs text-raff-neutral-600">
                        {t("metrics.ctr")}
                      </p>
                      <p className="text-lg font-bold text-raff-primary">
                        {product.views > 0
                          ? `${((product.clicks / product.views) * 100).toFixed(1)}%`
                          : "0%"}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-raff-neutral-600">
                        {t("metrics.conversion")}
                      </p>
                      <p className="text-lg font-bold text-raff-success">
                        {product.clicks > 0
                          ? `${((product.orders / product.clicks) * 100).toFixed(1)}%`
                          : "0%"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Results Count */}
      {!loading && filteredProducts.length > 0 && (
        <div className="mt-6 text-center text-sm text-raff-neutral-600">
          {t("showingResults", {
            count: filteredProducts.length,
            total: products.length,
          })}
        </div>
      )}
    </Container>
  );
}
