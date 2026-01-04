// src/app/orders/OrderHistoryContent.tsx
"use client";

import { OrdersListSkeleton } from "@/shared/components/OrderCardSkeleton";
import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Container,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Skeleton,
} from "@/shared/components/ui";
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  ShoppingBag,
} from "lucide-react";
import { formatPrice, formatDate, getLocalizedText } from "@/lib/utils";
import { ArrowForward } from "@/core/i18n";
import { AnimatedButton } from "@/shared/components/AnimatedButton";

interface OrderProduct {
  id: string;
  title: string;
  titleAr: string | null;
  slug: string;
  thumbnail: string | null;
  merchant: {
    id: string;
    name: string;
    nameAr: string | null;
    logo: string | null;
    sallaStoreUrl: string | null;
    zidStoreUrl: string | null;
  };
}

interface OrderMerchant {
  id: string;
  name: string;
  nameAr: string | null;
  logo: string | null;
  sallaStoreUrl: string | null;
  zidStoreUrl: string | null;
}

interface Order {
  id: string;
  orderNumber: string | null;
  productId: string | null;
  product: OrderProduct | null;
  merchantId: string | null;
  merchant: OrderMerchant | null;
  quantity: number;
  totalPrice: number;
  currency: string;
  status: string;
  platform: string | null;
  zidOrderId: string | null;
  sallaOrderId: string | null;
  zidStatus: string | null;
  sallaStatus: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  paymentStatus: string | null;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
}

interface OrdersResponse {
  orders: Order[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
}

const STATUS_CONFIG = {
  PENDING: {
    label: "status.pending",
    icon: Clock,
    color: "bg-yellow-100 text-yellow-800",
  },
  CONFIRMED: {
    label: "status.confirmed",
    icon: CheckCircle,
    color: "bg-blue-100 text-blue-800",
  },
  PROCESSING: {
    label: "status.processing",
    icon: Package,
    color: "bg-purple-100 text-purple-800",
  },
  SHIPPED: {
    label: "status.shipped",
    icon: Truck,
    color: "bg-indigo-100 text-indigo-800",
  },
  DELIVERED: {
    label: "status.delivered",
    icon: CheckCircle,
    color: "bg-green-100 text-green-800",
  },
  CANCELLED: {
    label: "status.cancelled",
    icon: XCircle,
    color: "bg-red-100 text-red-800",
  },
  REFUNDED: {
    label: "status.refunded",
    icon: XCircle,
    color: "bg-gray-100 text-gray-800",
  },
};

export function OrderHistoryContent() {
  const t = useTranslations("orders");
  const commonT = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const { status } = useSession();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/orders?page=${page}&limit=10`);

      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }

      const data: OrdersResponse = await response.json();
      setOrders(data.orders);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }

    if (status === "authenticated") {
      fetchOrders();
    }
  }, [status, router, fetchOrders]);

  const getStatusConfig = (status: string) => {
    return (
      STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ||
      STATUS_CONFIG.PENDING
    );
  };

  if (status === "loading" || loading) {
    return (
      <Container className="py-8 pt-20">
        {/* Header Skeleton */}
        <div className="mb-8">
          <Skeleton variant="shimmer" className="mb-2 h-9 w-48" />
          <Skeleton variant="shimmer" className="h-6 w-96" />
        </div>

        {/* Orders List Skeleton */}
        <OrdersListSkeleton count={5} />

        {/* Pagination Skeleton */}
        <div className="mt-8 flex items-center justify-between">
          <Skeleton variant="shimmer" className="h-5 w-32" />
          <div className="flex gap-2">
            <Skeleton variant="shimmer" className="h-10 w-24" />
            <Skeleton variant="shimmer" className="h-10 w-24" />
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-8 pt-20">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-raff-primary">
          {t("title")}
        </h1>
        <p className="text-raff-neutral-600">{t("subtitle")}</p>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 rounded-full bg-raff-neutral-100 p-6">
              <ShoppingBag className="h-12 w-12 text-raff-neutral-400" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-raff-primary">
              {t("noOrders")}
            </h3>
            <p className="mb-6 text-raff-neutral-600">
              {t("noOrdersDescription")}
            </p>
            <Link href="/products">
              <AnimatedButton className="gap-2">
                {t("startShopping")}
                <ArrowForward className="h-4 w-4" />
              </AnimatedButton>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const statusConfig = getStatusConfig(order.status);
            const StatusIcon = statusConfig.icon;

            const productTitle = order.product
              ? getLocalizedText(
                  locale,
                  order.product.titleAr,
                  order.product.title
                )
              : null;

            const merchantName = order.merchant
              ? getLocalizedText(
                  locale,
                  order.merchant.nameAr,
                  order.merchant.name
                )
              : t("unknownMerchant");

            const merchantUrl =
              order.platform === "SALLA"
                ? order.merchant?.sallaStoreUrl
                : order.merchant?.zidStoreUrl;

            return (
              <Card
                key={order.id}
                className="overflow-hidden transition-all duration-300 hover:shadow-lg"
              >
                <CardHeader className="border-b border-raff-neutral-200 bg-raff-neutral-50">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                      <CardTitle className="text-lg">
                        {t("orderNumber")}:{" "}
                        {order.orderNumber ||
                          order.id.slice(0, 8).toUpperCase()}
                      </CardTitle>
                      <p className="mt-1 text-sm text-raff-neutral-600">
                        {formatDate(new Date(order.createdAt), locale)}
                      </p>
                    </div>
                    <Badge className={statusConfig.color}>
                      <StatusIcon className="me-1 h-4 w-4" />
                      {t(statusConfig.label)}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-6">
                  <div className="grid gap-6 md:grid-cols-[1fr,auto]">
                    {/* Order Details */}
                    <div className="space-y-4">
                      {/* Product Info */}
                      {order.product && (
                        <div className="flex gap-4">
                          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-raff-neutral-100">
                            <div className="flex h-full items-center justify-center text-3xl opacity-40">
                              📦
                            </div>
                          </div>
                          <div className="flex-1">
                            <Link href={`/products/${order.product.slug}`}>
                              <h3 className="mb-1 font-semibold text-raff-primary transition-colors hover:text-raff-accent">
                                {productTitle}
                              </h3>
                            </Link>
                            <p className="text-sm text-raff-neutral-600">
                              {t("quantity")}: {order.quantity}
                            </p>
                            <p className="text-sm text-raff-neutral-600">
                              {t("merchant")}: {merchantName}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Price */}
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm text-raff-neutral-600">
                          {t("total")}:
                        </span>
                        <span className="text-2xl font-bold text-raff-primary">
                          {formatPrice(
                            order.totalPrice,
                            locale,
                            order.currency
                          )}
                        </span>
                      </div>

                      {/* Tracking Number */}
                      {order.trackingNumber && (
                        <div className="rounded-lg bg-raff-neutral-50 p-3">
                          <p className="mb-1 text-sm font-medium text-raff-neutral-700">
                            {t("trackingNumber")}
                          </p>
                          <p className="font-mono text-sm text-raff-primary">
                            {order.trackingNumber}
                          </p>
                        </div>
                      )}

                      {/* Order Timeline */}
                      <div className="border-t border-raff-neutral-200 pt-4">
                        <p className="mb-2 text-sm font-medium text-raff-neutral-700">
                          {t("timeline")}
                        </p>
                        <div className="space-y-2 text-sm text-raff-neutral-600">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>
                              {t("placed")}:{" "}
                              {formatDate(new Date(order.createdAt), locale)}
                            </span>
                          </div>
                          {order.confirmedAt && (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-blue-600" />
                              <span>
                                {t("confirmed")}:{" "}
                                {formatDate(
                                  new Date(order.confirmedAt),
                                  locale
                                )}
                              </span>
                            </div>
                          )}
                          {order.shippedAt && (
                            <div className="flex items-center gap-2">
                              <Truck className="h-4 w-4 text-indigo-600" />
                              <span>
                                {t("shipped")}:{" "}
                                {formatDate(new Date(order.shippedAt), locale)}
                              </span>
                            </div>
                          )}
                          {order.deliveredAt && (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span>
                                {t("delivered")}:{" "}
                                {formatDate(
                                  new Date(order.deliveredAt),
                                  locale
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
                      {order.product && (
                        <Link href={`/products/${order.product.slug}`}>
                          <AnimatedButton
                            variant="outline"
                            size="sm"
                            className="w-full gap-2"
                          >
                            {t("viewProduct")}
                            <ArrowForward className="h-4 w-4" />
                          </AnimatedButton>
                        </Link>
                      )}
                      {merchantUrl && (
                        <a
                          href={merchantUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <AnimatedButton
                            variant="outline"
                            size="sm"
                            className="w-full gap-2"
                          >
                            {t("visitStore")}
                            <ArrowForward className="h-4 w-4" />
                          </AnimatedButton>
                        </a>
                      )}
                      {order.trackingUrl && (
                        <a
                          href={order.trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <AnimatedButton size="sm" className="w-full gap-2">
                            {t("trackShipment")}
                            <Truck className="h-4 w-4" />
                          </AnimatedButton>
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <AnimatedButton
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
          >
            {commonT("actions.previous")}
          </AnimatedButton>
          <span className="px-4 text-sm text-raff-neutral-600">
            {t("pageInfo", { page, totalPages })}
          </span>
          <AnimatedButton
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
          >
            {commonT("actions.next")}
          </AnimatedButton>
        </div>
      )}
    </Container>
  );
}
