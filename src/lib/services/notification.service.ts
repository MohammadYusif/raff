// src/lib/services/notification.service.ts
import { prisma } from "@/lib/prisma";
import { NotificationType, NotificationPriority, Prisma } from "@prisma/client";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("notification");


interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  titleAr?: string;
  message: string;
  messageAr?: string;
  link?: string;
  priority?: NotificationPriority;
  metadata?: Record<string, unknown>;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        titleAr: params.titleAr || null,
        message: params.message,
        messageAr: params.messageAr || null,
        link: params.link || null,
        priority: params.priority || "NORMAL",
        metadata: params.metadata ? (params.metadata as Prisma.InputJsonValue) : undefined,
      },
    });

    return notification;
  } catch (error) {
    logger.error("Error creating notification", { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

export async function createBulkNotifications(
  notifications: CreateNotificationParams[]
) {
  try {
    await prisma.notification.createMany({
      data: notifications.map((n) => ({
        userId: n.userId,
        type: n.type,
        title: n.title,
        titleAr: n.titleAr || null,
        message: n.message,
        messageAr: n.messageAr || null,
        link: n.link || null,
        priority: n.priority || "NORMAL",
        metadata: n.metadata ? (n.metadata as Prisma.InputJsonValue) : undefined,
      })),
    });
  } catch (error) {
    logger.error("Error creating bulk notifications", { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

// Helper functions for common notification types
export async function notifyOrderCreated(
  userId: string,
  orderId: string,
  orderTotal: number,
  currency: string = "SAR"
) {
  return createNotification({
    userId,
    type: "ORDER_CREATED",
    title: "New Order Received",
    titleAr: "طلب جديد تم استلامه",
    message: `You received a new order worth ${orderTotal} ${currency}`,
    messageAr: `تلقيت طلبًا جديدًا بقيمة ${orderTotal} ${currency}`,
    link: `/merchant/orders/${orderId}`,
    priority: "HIGH",
    metadata: { orderId, orderTotal, currency },
  });
}

export async function notifyProductSyncCompleted(
  userId: string,
  productsCreated: number,
  productsUpdated: number
) {
  const total = productsCreated + productsUpdated;
  return createNotification({
    userId,
    type: "PRODUCT_SYNC_COMPLETED",
    title: "Product Sync Completed",
    titleAr: "اكتملت مزامنة المنتجات",
    message: `Successfully synced ${total} products (${productsCreated} new, ${productsUpdated} updated)`,
    messageAr: `تمت مزامنة ${total} منتج بنجاح (${productsCreated} جديد، ${productsUpdated} محدّث)`,
    link: "/merchant/products",
    priority: "NORMAL",
    metadata: { productsCreated, productsUpdated, total },
  });
}

export async function notifyProductOutOfStock(
  userId: string,
  productId: string,
  productName: string
) {
  return createNotification({
    userId,
    type: "PRODUCT_OUT_OF_STOCK",
    title: "Product Out of Stock",
    titleAr: "المنتج غير متوفر في المخزون",
    message: `${productName} is now out of stock`,
    messageAr: `${productName} غير متوفر في المخزون الآن`,
    link: `/merchant/products/${productId}`,
    priority: "HIGH",
    metadata: { productId, productName },
  });
}

export async function notifyNewCommission(
  userId: string,
  commissionAmount: number,
  orderId: string,
  currency: string = "SAR"
) {
  return createNotification({
    userId,
    type: "NEW_COMMISSION",
    title: "New Commission Earned",
    titleAr: "تم ربح عمولة جديدة",
    message: `You earned ${commissionAmount} ${currency} in commission`,
    messageAr: `ربحت ${commissionAmount} ${currency} كعمولة`,
    link: `/merchant/commissions`,
    priority: "NORMAL",
    metadata: { commissionAmount, orderId, currency },
  });
}

export async function notifyMerchantApproved(userId: string) {
  return createNotification({
    userId,
    type: "MERCHANT_APPROVED",
    title: "Merchant Account Approved",
    titleAr: "تمت الموافقة على حساب التاجر",
    message: "Congratulations! Your merchant account has been approved.",
    messageAr: "تهانينا! تمت الموافقة على حساب التاجر الخاص بك.",
    link: "/merchant/dashboard",
    priority: "URGENT",
  });
}

export async function notifyMerchantRejected(
  userId: string,
  reason: string
) {
  return createNotification({
    userId,
    type: "MERCHANT_REJECTED",
    title: "Merchant Application Rejected",
    titleAr: "تم رفض طلب التاجر",
    message: `Your merchant application was rejected: ${reason}`,
    messageAr: `تم رفض طلب التاجر الخاص بك: ${reason}`,
    link: "/merchant/settings",
    priority: "HIGH",
    metadata: { reason },
  });
}
