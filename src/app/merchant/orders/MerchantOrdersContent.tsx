// src/app/merchant/orders/MerchantOrdersContent.tsx
"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import {
  Container,
  Card,
  CardContent,
  Badge,
  Skeleton,
  AnimatedButton,
} from "@/shared/components/ui";
import {
  Package,
  CheckCircle,
  Clock,
  Truck,
  XCircle,
  RefreshCcw,
  ChevronLeft,
  ChevronRight,
  Filter,
  DollarSign,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { formatPrice, formatDate } from "@/lib/utils";
import { useLocale } from "@/core/i18n";
import type { OrderStatus } from "@prisma/client";

interface OrderData {
  id: string;
  orderNumber: string | null;
  platform: "ZID" | "SALLA" | null;
  product: {
    id: string;
    name: string;
    nameAr: string | null;
    image: string | null;
    price: number;
    currency: string;
  } | null;
  quantity: number;
  totalPrice: number;
  currency: string;
  status: OrderStatus;
  paymentStatus: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippingMethod: string | null;
  clickTracking: {
    id: string;
    referrerCode: string;
    referrerUrl: string | null;
    platform: string;
  } | null;
  commission: {
    id: string;
    amount: number;
    status: string;
    rate: number;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface OrdersResponse {
  orders: OrderData[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
  summary: {
    totalOrders: number;
    totalRevenue: number;
    totalCommissions: number;
    averageOrderValue: number;
  };
}

const STATUS_CONFIG = {
  PENDING: {
    label: "status.pending",
    icon: Clock,
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  CONFIRMED: {
    label: "status.confirmed",
    icon: CheckCircle,
    color: "bg-blue-100 text-blue-800 border-blue-200",
  },
  PROCESSING: {
    label: "status.processing",
    icon: Package,
    color: "bg-purple-100 text-purple-800 border-purple-200",
  },
  SHIPPED: {
    label: "status.shipped",
    icon: Truck,
    color: "bg-indigo-100 text-indigo-800 border-indigo-200",
  },
  DELIVERED: {
    label: "status.delivered",
    icon: CheckCircle,
    color: "bg-green-100 text-green-800 border-green-200",
  },
  CANCELLED: {
    label: "status.cancelled",
    icon: XCircle,
    color: "bg-red-100 text-red-800 border-red-200",
  },
  REFUNDED: {
    label: "status.refunded",
    icon: RefreshCcw,
    color: "bg-gray-100 text-gray-800 border-gray-200",
  },
} as const;

const COMMISSION_STATUS_CONFIG = {
  PENDING: { label: "commission.pending", color: "bg-yellow-100 text-yellow-800" },
  APPROVED: { label: "commission.approved", color: "bg-green-100 text-green-800" },
  ON_HOLD: { label: "commission.onHold", color: "bg-orange-100 text-orange-800" },
  PAID: { label: "commission.paid", color: "bg-blue-100 text-blue-800" },
  CANCELLED: { label: "commission.cancelled", color: "bg-red-100 text-red-800" },
} as const;

function OrdersLoadingSkeleton() {
  return (
    <Container className="py-8">
      <div className="mb-6 space-y-2">
        <Skeleton variant="shimmer" className="h-8 w-48" />
        <Skeleton variant="shimmer" className="h-5 w-96" />
      </div>

      {/* Summary Cards Skeleton */}
      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="space-y-3">
                <Skeleton variant="shimmer" className="h-4 w-24" />
                <Skeleton variant="shimmer" className="h-8 w-32" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Orders List Skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex gap-4">
                <Skeleton variant="shimmer" className="h-20 w-20 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton variant="shimmer" className="h-5 w-48" />
                  <Skeleton variant="shimmer" className="h-4 w-32" />
                  <Skeleton variant="shimmer" className="h-4 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </Container>
  );
}

export function MerchantOrdersContent() {
  const t = useTranslations("merchantOrders");
  const { locale } = useLocale();
  const [data, setData] = useState<OrdersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "ALL">("ALL");
  const limit = 10;

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      if (statusFilter !== "ALL") {
        params.append("status", statusFilter);
      }

      const response = await fetch(`/api/merchant/orders?${params}`);
      if (!response.ok) throw new Error("Failed to fetch orders");

      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  if (loading && !data) {
    return <OrdersLoadingSkeleton />;
  }

  if (!data) {
    return (
      <Container className="py-8">
        <div className="text-center text-raff-neutral-600">
          {t("error.loadFailed")}
        </div>
      </Container>
    );
  }

  const { orders, pagination, summary } = data;

  return (
    <Container className="py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="mb-2 text-3xl font-bold text-raff-primary">
          {t("title")}
        </h1>
        <p className="text-raff-neutral-600">{t("subtitle")}</p>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-raff-neutral-600">{t("summary.totalOrders")}</p>
                <p className="text-2xl font-bold text-raff-primary">
                  {summary.totalOrders}
                </p>
              </div>
              <div className="rounded-full bg-raff-primary/10 p-3">
                <ShoppingCart className="h-6 w-6 text-raff-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-raff-neutral-600">{t("summary.totalRevenue")}</p>
                <p className="text-2xl font-bold text-raff-primary">
                  {formatPrice(summary.totalRevenue, locale, "SAR")}
                </p>
              </div>
              <div className="rounded-full bg-green-100 p-3">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-raff-neutral-600">{t("summary.totalCommissions")}</p>
                <p className="text-2xl font-bold text-raff-primary">
                  {formatPrice(summary.totalCommissions, locale, "SAR")}
                </p>
              </div>
              <div className="rounded-full bg-blue-100 p-3">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-raff-neutral-600">{t("summary.avgOrderValue")}</p>
                <p className="text-2xl font-bold text-raff-primary">
                  {formatPrice(summary.averageOrderValue, locale, "SAR")}
                </p>
              </div>
              <div className="rounded-full bg-purple-100 p-3">
                <Package className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Filter className="h-5 w-5 text-raff-neutral-600" />
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  statusFilter === "ALL"
                    ? "bg-raff-primary text-white"
                    : "bg-raff-neutral-100 text-raff-neutral-700 hover:bg-raff-neutral-200"
                }`}
              >
                {t("filters.all")}
              </button>
              {(Object.keys(STATUS_CONFIG) as OrderStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    statusFilter === status
                      ? "bg-raff-primary text-white"
                      : "bg-raff-neutral-100 text-raff-neutral-700 hover:bg-raff-neutral-200"
                  }`}
                >
                  {t(STATUS_CONFIG[status].label)}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      {orders.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="mx-auto mb-4 h-12 w-12 text-raff-neutral-400" />
            <p className="text-lg text-raff-neutral-600">{t("noOrders")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const statusConfig = STATUS_CONFIG[order.status];
            const StatusIcon = statusConfig.icon;
            const productName = order.product
              ? locale === "ar"
                ? order.product.nameAr || order.product.name
                : order.product.name
              : t("noProduct");

            return (
              <Card key={order.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    {/* Order Info */}
                    <div className="flex gap-4">
                      {/* Product Image */}
                      {order.product?.image ? (
                        <div className="relative h-20 w-20 overflow-hidden rounded-lg">
                          <Image
                            src={order.product.image}
                            alt={productName}
                            fill
                            className="object-cover"
                            sizes="80px"
                          />
                        </div>
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-raff-neutral-100">
                          <Package className="h-8 w-8 text-raff-neutral-400" />
                        </div>
                      )}

                      {/* Details */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-raff-primary">
                            {productName}
                          </h3>
                          {order.platform && (
                            <Badge variant="outline" className="text-xs">
                              {order.platform}
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-3 text-sm text-raff-neutral-600">
                          {order.orderNumber && (
                            <span>
                              {t("orderNumber")}: <strong>{order.orderNumber}</strong>
                            </span>
                          )}
                          <span>
                            {t("quantity")}: <strong>{order.quantity}</strong>
                          </span>
                          <span>
                            {t("total")}:{" "}
                            <strong>
                              {formatPrice(order.totalPrice, locale, order.currency)}
                            </strong>
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Badge className={`gap-1 ${statusConfig.color}`}>
                            <StatusIcon className="h-3 w-3" />
                            {t(statusConfig.label)}
                          </Badge>

                          {order.commission && (
                            <Badge
                              className={
                                COMMISSION_STATUS_CONFIG[
                                  order.commission.status as keyof typeof COMMISSION_STATUS_CONFIG
                                ]?.color || "bg-gray-100 text-gray-800"
                              }
                            >
                              {t("commission.label")}:{" "}
                              {formatPrice(order.commission.amount, locale, order.currency)}
                            </Badge>
                          )}
                        </div>

                        {/* Tracking Information */}
                        {(order.trackingNumber || order.trackingUrl) && (
                          <div className="flex items-center gap-2 text-sm">
                            <Truck className="h-4 w-4 text-raff-accent" />
                            <div className="flex flex-col gap-1">
                              {order.shippingMethod && (
                                <span className="text-raff-neutral-600">
                                  {order.shippingMethod}
                                </span>
                              )}
                              {order.trackingNumber && (
                                <span className="font-mono text-xs text-raff-neutral-700">
                                  {t("trackingNumber", { defaultValue: "Tracking" })}: {order.trackingNumber}
                                </span>
                              )}
                              {order.trackingUrl && (
                                <a
                                  href={order.trackingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-raff-accent hover:underline"
                                >
                                  {t("trackShipment", { defaultValue: "Track Shipment" })} →
                                </a>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="text-xs text-raff-neutral-500">
                          {formatDate(new Date(order.createdAt), locale)}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-raff-neutral-600">
            {t("pagination.showing", {
              start: (page - 1) * limit + 1,
              end: Math.min(page * limit, pagination.totalCount),
              total: pagination.totalCount,
            })}
          </div>

          <div className="flex gap-2">
            <AnimatedButton
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              variant="outline"
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              {t("pagination.previous")}
            </AnimatedButton>

            <AnimatedButton
              onClick={() => setPage((p) => p + 1)}
              disabled={!pagination.hasMore}
              variant="outline"
              className="gap-2"
            >
              {t("pagination.next")}
              <ChevronRight className="h-4 w-4" />
            </AnimatedButton>
          </div>
        </div>
      )}
    </Container>
  );
}
